import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { supabaseDb } from '../db/supabaseDb.js';
import { AuthenticatedRequest, optionalAuthenticateToken } from '../middleware/auth.js';
import { aiMatchingService } from '../services/aiMatcher.js';
import { aiLimiter } from '../middleware/rateLimiters.js';
import { sanitizeString } from '../middleware/validation.js';

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

export function createAiRouter(): Router {
  const router = Router();

  /**
   * POST /api/ai/search
   * Natural Language & Multimodal Semantic Search
   */
  router.post('/search', aiLimiter, optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query, type = 'ALL', imageBase64 } = req.body;
      if (!query || String(query).trim().length === 0) {
        return res.status(400).json({ error: 'Please enter a natural language description to search.' });
      }

      const cleanQuery = sanitizeString(String(query).trim());

      // 1. Stage 1: Preprocessing & Intent Extraction
      const intent = await aiMatchingService.extractQueryIntent(cleanQuery, imageBase64);

      // 2. Stage 2: Database Candidate Retrieval
      const candidates = await aiMatchingService.findCandidatesForIntent(intent, type);

      // 3. Stage 3 & 4: Multimodal Evaluation, Ranking & Deep Reasoner
      const results = await aiMatchingService.evaluateNaturalLanguageMatches(cleanQuery, intent, candidates);

      return res.json({
        query: cleanQuery,
        normalizedQuery: intent.normalizedQuery || cleanQuery,
        intent,
        totalCandidatesScanned: candidates.length,
        results
      });
    } catch (err: any) {
      console.error('AI search endpoint error:', err);
      return res.status(500).json({ error: 'Failed to process AI natural language search.' });
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
