import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { supabaseDb, ItemRecord } from '../db/supabaseDb.js';
import { AuthenticatedRequest, optionalAuthenticateToken } from '../middleware/auth.js';
import { aiMatchingService, NormalizedItemType, ExtractedIntent } from '../services/aiMatcher.js';
import { aiLimiter } from '../middleware/rateLimiters.js';
import { sanitizeString } from '../middleware/validation.js';
import {
  multilingualEngine,
  StructuredSearchIntent,
  ConversationSession
} from '../services/multilingualEngine.js';
import { conversationManager } from '../services/conversationManager.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true; // JPEG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true; // PNG
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return true; // WebP
  }
  return false;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(path.basename(file.originalname)).toLowerCase();
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.jpg';
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `ai-upload-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedMime = /^image\/(jpeg|png|webp)$/i;
    const isMimeValid = allowedMime.test(file.mimetype);
    const rawExt = path.extname(path.basename(file.originalname)).toLowerCase();
    const isExtValid = ALLOWED_EXTENSIONS.has(rawExt);
    if (isMimeValid && isExtValid) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
  }
});

/**
 * Helper to retrieve candidate items from database respecting conversational filters
 */
async function retrieveCandidatesForConversationalFilters(
  activeFilters: ConversationSession['activeFilters'],
  targetTypeOverride?: string
): Promise<ItemRecord[]> {
  let targetType: string | undefined = undefined;
  if (targetTypeOverride && targetTypeOverride !== 'ALL') {
    targetType = targetTypeOverride;
  } else if (activeFilters.item_type === 'LOST') {
    targetType = 'FOUND';
  } else if (activeFilters.item_type === 'FOUND') {
    targetType = 'LOST';
  }

  const { items: allActiveItems } = await supabaseDb.getItems({
    type: targetType,
    limit: 150
  });

  const compatibleCandidates: Array<{ item: ItemRecord; heuristicScore: number }> = [];

  for (const item of allActiveItems) {
    const candNorm = aiMatchingService.normalizeItem(item.description, item.title, item.category);

    // If an object is specified in activeFilters, check compatibility
    if (activeFilters.object && activeFilters.object !== 'item') {
      const intentNorm: NormalizedItemType = {
        object_type: activeFilters.object,
        category: (activeFilters.category || 'other') as any,
        subcategory: (activeFilters.subcategory || 'other') as any,
        brand: activeFilters.brand,
        model: activeFilters.model,
        color: (activeFilters.color && activeFilters.color[0]) || undefined,
        features: []
      };

      const compat = aiMatchingService.checkCompatibility(intentNorm, candNorm);
      if (!compat.isCompatible) {
        continue;
      }
    }

    let score = 30;

    // Subcategory match
    if (activeFilters.subcategory && candNorm.subcategory === activeFilters.subcategory) {
      score += 25;
    }

    // Color match
    if (activeFilters.color && activeFilters.color.length > 0 && candNorm.color) {
      const hasColor = activeFilters.color.some(c => c.toLowerCase() === candNorm.color?.toLowerCase());
      if (hasColor) score += 20;
    }

    // Brand match
    if (activeFilters.brand && candNorm.brand) {
      if (activeFilters.brand.toLowerCase() === candNorm.brand.toLowerCase()) {
        score += 25;
      }
    }

    // Location filter / proximity
    if (activeFilters.location) {
      const locProximity = aiMatchingService.calculateLocationProximity(item.location, activeFilters.location);
      score += locProximity.score;
    }

    // Date filter / proximity
    if (activeFilters.date && item.date) {
      const dateProximity = aiMatchingService.calculateTemporalProximity(item.date, activeFilters.date);
      score += dateProximity.score;
      if (item.date === activeFilters.date) {
        score += 30;
      }
    }

    // Keyword / Title match
    const itemText = `${item.title} ${item.description} ${item.characteristics || ''} ${item.location}`.toLowerCase();
    if (activeFilters.object && itemText.includes(activeFilters.object.toLowerCase())) {
      score += 15;
    }

    compatibleCandidates.push({ item, heuristicScore: score });
  }

  compatibleCandidates.sort((a, b) => b.heuristicScore - a.heuristicScore);
  return compatibleCandidates.slice(0, 15).map(c => c.item);
}

export function createAiRouter(): Router {
  const router = Router();

  /**
   * POST /api/ai/conversational-search
   * Multilingual Natural Language & Conversational AI Search
   */
  router.post('/conversational-search', aiLimiter, optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        query,
        sessionId,
        type = 'ALL',
        preferredLanguage,
        imageBase64
      } = req.body;

      if (!query || String(query).trim().length === 0) {
        return res.status(400).json({ error: 'Please enter a query or voice transcription to search.' });
      }

      const cleanQuery = sanitizeString(String(query).trim());
      const session = conversationManager.getOrCreateSession(sessionId, req.user?.id);

      // 1. Language Detection
      const detection = multilingualEngine.detectLanguage(cleanQuery);
      if (preferredLanguage && detection.language === 'en') {
        detection.language = preferredLanguage;
      }

      // 2. Multilingual Intent Extraction relative to conversation context
      const intent: StructuredSearchIntent = await multilingualEngine.extractMultilingualIntent(cleanQuery, session);

      // 3. Handle Special Conversational Intents
      if (intent.intent === 'explain_match' && session.resultContextItemIds.length > 0) {
        // User asked: "Why is this a match?" / "tell me why this matched"
        const targetItemId = session.resultContextItemIds[0];
        const targetItem = await supabaseDb.getItemById(targetItemId);

        const explanation = await multilingualEngine.generateConversationalResponse(
          intent,
          1,
          detection,
          targetItem?.title || undefined
        );

        conversationManager.mergeTurn(session.sessionId, cleanQuery, intent, explanation, session.resultContextItemIds);

        return res.json({
          sessionId: session.sessionId,
          originalQuery: cleanQuery,
          detectedLanguage: detection,
          normalizedIntent: intent,
          activeFilters: session.activeFilters,
          message: explanation,
          results: targetItem ? [{ item: targetItem, match_score: 90, matching_attributes: ['Same Item Type', 'Proximity Match'], differences: [] }] : [],
          followUpSuggestions: multilingualEngine.getLocalizedFollowUpSuggestions(detection.language),
          usedFallback: false
        });
      }

      // 4. Retrieve Candidates using active conversational filters
      const targetFilterType = type !== 'ALL' ? type : intent.item_type;
      const candidates = await retrieveCandidatesForConversationalFilters(session.activeFilters, targetFilterType);

      // 5. Evaluate and Rank Candidates
      const legacyIntent: ExtractedIntent = {
        normalizedQuery: intent.normalized_query,
        item_type: intent.item_type,
        object: intent.object.value,
        category: intent.category.value,
        subcategory: intent.subcategory,
        brand: intent.brand || undefined,
        model: intent.model || undefined,
        color: intent.color[0],
        colors: intent.color,
        location: intent.location.normalized || intent.location.raw || undefined,
        date: intent.date.normalized || intent.date.raw || undefined,
        time: intent.time || undefined,
        relative_date: intent.date.raw || undefined,
        resolved_date: intent.date.normalized || undefined,
        identifying_features: intent.features,
        features: intent.features,
        keywords: intent.keywords,
        confidence: intent.object.confidence
      };

      const results = await aiMatchingService.evaluateNaturalLanguageMatches(cleanQuery, legacyIntent, candidates);
      const resultItemIds = results.map(r => r.item.id);

      // 6. Generate Conversational AI Response in the user's detected language
      const aiResponseText = await multilingualEngine.generateConversationalResponse(
        intent,
        results.length,
        detection,
        results[0]?.item?.title
      );

      // 7. Update Session State
      conversationManager.mergeTurn(session.sessionId, cleanQuery, intent, aiResponseText, resultItemIds);

      const suggestions = multilingualEngine.getLocalizedFollowUpSuggestions(detection.language);

      return res.json({
        sessionId: session.sessionId,
        originalQuery: cleanQuery,
        detectedLanguage: detection,
        normalizedIntent: intent,
        activeFilters: session.activeFilters,
        message: aiResponseText,
        results,
        followUpSuggestions: suggestions,
        totalCandidatesScanned: candidates.length,
        usedFallback: false
      });
    } catch (err: any) {
      console.error('Conversational AI search error:', err);
      return res.status(500).json({ error: 'Failed to process conversational search.' });
    }
  });

  /**
   * POST /api/ai/search
   * Legacy and single-turn endpoint upgraded with Multilingual Intelligence
   */
  router.post('/search', aiLimiter, optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query, type = 'ALL', imageBase64 } = req.body;
      if (!query || String(query).trim().length === 0) {
        return res.status(400).json({ error: 'Please enter a natural language description to search.' });
      }

      const cleanQuery = sanitizeString(String(query).trim());
      const detection = multilingualEngine.detectLanguage(cleanQuery);
      const intent = await multilingualEngine.extractMultilingualIntent(cleanQuery);

      const legacyIntent: ExtractedIntent = {
        normalizedQuery: intent.normalized_query,
        item_type: intent.item_type,
        object: intent.object.value,
        category: intent.category.value,
        subcategory: intent.subcategory,
        brand: intent.brand || undefined,
        model: intent.model || undefined,
        color: intent.color[0],
        colors: intent.color,
        location: intent.location.normalized || intent.location.raw || undefined,
        date: intent.date.normalized || intent.date.raw || undefined,
        time: intent.time || undefined,
        relative_date: intent.date.raw || undefined,
        resolved_date: intent.date.normalized || undefined,
        identifying_features: intent.features,
        features: intent.features,
        keywords: intent.keywords,
        confidence: intent.object.confidence
      };

      const candidates = await aiMatchingService.findCandidatesForIntent(legacyIntent, type);
      const results = await aiMatchingService.evaluateNaturalLanguageMatches(cleanQuery, legacyIntent, candidates);

      return res.json({
        query: cleanQuery,
        detectedLanguage: detection,
        normalizedQuery: intent.normalized_query || cleanQuery,
        intent: legacyIntent,
        structuredIntent: intent,
        totalCandidatesScanned: candidates.length,
        results
      });
    } catch (err: any) {
      console.error('AI search endpoint error:', err);
      return res.status(500).json({ error: 'Failed to process AI natural language search.' });
    }
  });

  /**
   * DELETE /api/ai/conversation/:sessionId
   * Resets conversation context
   */
  router.delete('/conversation/:sessionId', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      conversationManager.clearSession(sessionId);
      return res.json({ message: 'Conversation context reset successfully.', sessionId });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to reset conversation.' });
    }
  });

  /**
   * POST /api/ai/analyze-image
   * Visual Trait Extraction & Quality Check
   */
  router.post('/analyze-image', aiLimiter, optionalAuthenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageUrl, imageBase64, hintText = '' } = req.body;

      let filePath: string | undefined;
      if (req.file) {
        filePath = path.resolve(uploadDir, req.file.filename);
        try {
          const fileBuf = fs.readFileSync(filePath);
          if (!isValidImageMagicBytes(fileBuf)) {
            try { fs.unlinkSync(filePath); } catch {}
            return res.status(400).json({ error: 'Uploaded file is not a valid JPEG, PNG, or WebP image.' });
          }
        } catch {
          return res.status(400).json({ error: 'Failed to process uploaded image file.' });
        }
      }

      const cleanHint = sanitizeString(String(hintText || ''));
      const analysis = await aiMatchingService.analyzeImage({
        filePath,
        url: imageUrl,
        base64: imageBase64,
        hintText: cleanHint
      });

      return res.json({
        analysis,
        safetyDisclaimer: 'Visual features extracted automatically. Please verify against physical item.'
      });
    } catch (err: any) {
      console.error('AI analyze-image endpoint error:', err);
      return res.status(500).json({ error: 'Failed to analyze image.' });
    }
  });

  /**
   * POST /api/ai/compare
   * Direct Deep Comparison between two items or descriptions
   */
  router.post('/compare', aiLimiter, optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { itemA, itemB } = req.body;

      if (!itemA || !itemB) {
        return res.status(400).json({ error: 'Both itemA and itemB are required for comparison.' });
      }

      const normA = aiMatchingService.normalizeItem(itemA.description || '', itemA.title || '', itemA.category || '');
      const normB = aiMatchingService.normalizeItem(itemB.description || '', itemB.title || '', itemB.category || '');

      const isCompatible = aiMatchingService.checkCompatibility(normA, normB);
      if (!isCompatible) {
        return res.json({
          score: 0,
          confidenceLevel: 'LOW',
          isCompatible: false,
          featureMatches: [],
          mismatches: [`Fundamentally incompatible items: ${normA.category || normA.subcategory} vs ${normB.category || normB.subcategory}`],
          reasoning: 'Items belong to conflicting subcategories and cannot match.',
          safetyDisclaimer: 'Verification required before any claim resolution.'
        });
      }

      const result = await aiMatchingService.compareItemsDeep(itemA, itemB);

      return res.json({
        isCompatible: true,
        ...result
      });
    } catch (err: any) {
      console.error('AI compare endpoint error:', err);
      return res.status(500).json({ error: 'Failed to compare items.' });
    }
  });

  /**
   * GET /api/ai/items/:id/matches
   * Retrieve or refresh potential matches for a specific item
   */
  router.get('/items/:id/matches', aiLimiter, optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const item = await supabaseDb.getItemById(id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const matches = await supabaseDb.getPotentialMatchesForItem(id, item.type);
      return res.json({
        itemId: id,
        itemType: item.type,
        matchesCount: matches.length,
        matches
      });
    } catch (err: any) {
      console.error('AI item matches endpoint error:', err);
      return res.status(500).json({ error: 'Failed to get potential matches for item.' });
    }
  });

  return router;
}
