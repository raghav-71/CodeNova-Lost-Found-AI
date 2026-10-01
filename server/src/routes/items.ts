import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { supabaseDb, ItemRecord } from '../db/supabaseDb.js';
import { AuthenticatedRequest, authenticateToken, optionalAuthenticateToken } from '../middleware/auth.js';
import { aiMatchingService } from '../services/aiMatcher.js';
import { supabaseAdmin, isSupabaseServerConfigured } from '../services/supabase.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `item-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/i;
    const isMimeValid = allowed.test(file.mimetype);
    const isExtValid = allowed.test(path.extname(file.originalname));
    if (isMimeValid && isExtValid) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
  }
});

export function createItemsRouter(): Router {
  const router = Router();

  // Natural Language AI Search
  router.post('/ai-search', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query, type = 'ALL', imageBase64 } = req.body;
      if (!query || String(query).trim().length === 0) {
        return res.status(400).json({ error: 'Please enter a natural language description to search.' });
      }

      const cleanQuery = String(query).trim();

      // 1. Stage 1: Extract Intent & Entities using Gemini / Fallback
      const intent = await aiMatchingService.extractQueryIntent(cleanQuery, imageBase64);

      // 2. Stage 2: Retrieve Candidates from Database using multi-signal retrieval
      const candidates = await aiMatchingService.findCandidatesForIntent(intent, type);

      // 3. Stage 3 & 4: Deep Match Reasoning with Gemini / Fallback
      const results = await aiMatchingService.evaluateNaturalLanguageMatches(cleanQuery, intent, candidates);

      return res.json({
        query: cleanQuery,
        intent,
        totalCandidatesScanned: candidates.length,
        results
      });
    } catch (err: any) {
      console.error('AI search error:', err);
      return res.status(500).json({ error: 'Failed to complete AI natural language search.' });
    }
  });

  // List & Search items with advanced filters
  router.get('/', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        q,
        type,
        category,
        location,
        status,
        sort = 'newest',
        userId,
        limit = 50,
        offset = 0
      } = req.query;

      const { items, total } = await supabaseDb.getItems({
        q: q ? String(q) : undefined,
        type: type ? String(type) : undefined,
        category: category ? String(category) : undefined,
        location: location ? String(location) : undefined,
        status: status ? String(status) : undefined,
        sort: sort ? String(sort) : undefined,
        userId: userId ? String(userId) : undefined,
        limit: Number(limit),
        offset: Number(offset)
      });

      return res.json({
        items,
        total,
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (err: any) {
      console.error('Fetch items error:', err);
      return res.status(500).json({ error: 'Failed to retrieve items.' });
    }
  });

  // Get item by ID
  router.get('/:id', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const item = await supabaseDb.getItemById(id);

      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const isOwner = req.user?.id === item.user_id;

      // Potential matches for this item
      const matches = await supabaseDb.getPotentialMatchesForItem(id, item.type);

      // Fetch user claim or all claims if owner
      let userClaim: any = null;
      let allClaims: any[] = [];

      if (req.user) {
        userClaim = await supabaseDb.getUserClaimForItem(id, req.user.id);
        if (isOwner) {
          allClaims = await supabaseDb.getClaimsForItem(id);
        }
      }

      return res.json({
        item,
        isOwner,
        matches,
        userClaim,
        claims: allClaims
      });
    } catch (err: any) {
      console.error('Fetch item details error:', err);
      return res.status(500).json({ error: 'Failed to retrieve item details.' });
    }
  });

  // Real-time Multimodal Image Verification & Cross-Validation
  router.post('/verify-image', optionalAuthenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title = '', description = '', category = '', imageUrl, imageBase64 } = req.body;

      let filePath: string | undefined;
      if (req.file) {
        filePath = path.resolve(uploadDir, req.file.filename);
      }

      const hintText = `${title} ${description} ${category} ${req.file?.originalname || ''}`;
      const imageAnalysis = await aiMatchingService.analyzeImage({
        filePath,
        url: imageUrl,
        base64: imageBase64,
        hintText
      });

      const normText = aiMatchingService.normalizeItem(description, title, category);
      const consistency = aiMatchingService.evaluateTextAndImageConsistency(normText, imageAnalysis);

      return res.json({
        imageAnalysis,
        consistency,
        normText
      });
    } catch (err: any) {
      console.error('Verify image error:', err);
      return res.status(500).json({ error: 'Failed to complete image verification.' });
    }
  });

  // Create new Lost or Found item
  router.post('/', authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        type,
        title,
        description,
        category,
        location,
        building_zone,
        date,
        time,
        characteristics,
        imageUrl,
        imageBase64
      } = req.body;

      if (!type || !['LOST', 'FOUND'].includes(type.toUpperCase())) {
        return res.status(400).json({ error: 'Type must be either LOST or FOUND.' });
      }

      if (!title || !category || !description || !location || !date) {
        return res.status(400).json({ error: 'Title, category, description, location and date are required.' });
      }

      const itemId = crypto.randomUUID();
      const userId = req.user!.id;

      // Ensure profile exists
      let profile = await supabaseDb.getProfile(userId);
      if (!profile) {
        await supabaseDb.upsertProfile({
          id: userId,
          full_name: req.user!.name,
          email: req.user!.email,
          college: req.user!.campus,
          avatar_url: req.user!.avatar,
          phone: req.user!.phone
        });
      }

      // Determine primary image
      let primaryImage = '';
      let uploadedFilePath: string | undefined;

      if (req.file) {
        uploadedFilePath = path.resolve(uploadDir, req.file.filename);
        if (isSupabaseServerConfigured) {
          try {
            const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
            const storagePath = `items/item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
            const fileBuffer = fs.readFileSync(uploadedFilePath);
            const { error: uploadError } = await supabaseAdmin.storage
              .from('item-images')
              .upload(storagePath, fileBuffer, {
                contentType: req.file.mimetype,
                upsert: true
              });
            if (!uploadError) {
              const { data: pubData } = supabaseAdmin.storage.from('item-images').getPublicUrl(storagePath);
              primaryImage = pubData.publicUrl;
            } else {
              primaryImage = `/uploads/${req.file.filename}`;
            }
          } catch {
            primaryImage = `/uploads/${req.file.filename}`;
          }
        } else {
          primaryImage = `/uploads/${req.file.filename}`;
        }
      } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
        primaryImage = imageUrl.trim();
      } else {
        primaryImage = getCategoryPlaceholder(category);
      }

      // Perform server-side Multimodal AI Vision Analysis
      let imageAnalysis: any = null;
      let consistencyResult: any = {
        consistency_level: 'CONSISTENT',
        object_compatible: true,
        has_mismatch: false
      };

      if (uploadedFilePath || (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0) || imageBase64) {
        try {
          const hintText = `${title} ${description} ${category} ${req.file?.originalname || ''}`;
          imageAnalysis = await aiMatchingService.analyzeImage({
            filePath: uploadedFilePath,
            url: imageUrl,
            base64: imageBase64,
            hintText
          });

          const normText = aiMatchingService.normalizeItem(description, title, category);
          consistencyResult = aiMatchingService.evaluateTextAndImageConsistency(normText, imageAnalysis);
        } catch (visionErr) {
          console.warn('Image analysis failed, proceeding with fallback:', visionErr);
        }
      }

      const createdItem: ItemRecord = await supabaseDb.createItem({
        id: itemId,
        user_id: userId,
        type: type.toUpperCase() as 'LOST' | 'FOUND',
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        location: location.trim(),
        building_zone: building_zone?.trim() || undefined,
        date: date.trim(),
        time: time?.trim() || undefined,
        status: 'ACTIVE',
        primary_image: primaryImage,
        characteristics: characteristics?.trim() || undefined,
        ai_object_type: imageAnalysis?.object_type,
        ai_category: imageAnalysis?.category,
        ai_subcategory: imageAnalysis?.subcategory,
        ai_brand: imageAnalysis?.brand,
        ai_model: imageAnalysis?.model,
        ai_color: imageAnalysis?.color,
        ai_features: imageAnalysis?.visible_features || [],
        ai_image_confidence: imageAnalysis?.confidence,
        ai_text_image_consistency: consistencyResult.consistency_level,
        ai_analysis_version: imageAnalysis?.analysis_model,
        ai_analyzed_at: imageAnalysis?.analyzed_at,
        ai_image_analysis: imageAnalysis
      });

      // Run AI potential matching pipeline
      let matchesCount = 0;
      try {
        matchesCount = await aiMatchingService.findMatchesForItem(createdItem);
      } catch (matchErr) {
        console.warn('Matching pipeline error:', matchErr);
      }

      const finalItem = await supabaseDb.getItemById(itemId);

      return res.status(201).json({
        message: `${type === 'LOST' ? 'Lost' : 'Found'} item reported successfully.`,
        item: finalItem || createdItem,
        matchesFound: matchesCount,
        consistency: consistencyResult,
        warning: consistencyResult.has_mismatch ? consistencyResult.warning_message : undefined
      });
    } catch (err: any) {
      console.error('Create item error:', err);
      return res.status(500).json({ error: 'Failed to create item report.' });
    }
  });

  // Update item
  router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, category, location, building_zone, date, time, status, characteristics } = req.body;

      const item = await supabaseDb.getItemById(id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      if (item.user_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'You are not authorized to update this item.' });
      }

      const updated = await supabaseDb.updateItem(id, req.user!.id, {
        title,
        description,
        category,
        location,
        building_zone,
        date,
        time,
        status,
        characteristics
      });

      return res.json({ message: 'Item updated successfully', item: updated });
    } catch (err: any) {
      console.error('Update item error:', err);
      return res.status(500).json({ error: 'Failed to update item.' });
    }
  });

  // Delete item
  router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const item = await supabaseDb.getItemById(id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      if (item.user_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'You are not authorized to delete this item.' });
      }

      const deleted = await supabaseDb.deleteItem(id, req.user!.id);
      if (!deleted) {
        return res.status(403).json({ error: 'You are not authorized to delete this item.' });
      }

      return res.json({ message: 'Item deleted successfully' });
    } catch (err: any) {
      console.error('Delete item error:', err);
      return res.status(500).json({ error: 'Failed to delete item.' });
    }
  });

  // Re-run matching pipeline on demand
  router.post('/:id/rematch', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const item = await supabaseDb.getItemById(id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const matchesCount = await aiMatchingService.findMatchesForItem(item);
      return res.json({ message: 'AI matching executed', matchesFound: matchesCount });
    } catch (err: any) {
      console.error('Rematch error:', err);
      return res.status(500).json({ error: 'Failed to execute matching.' });
    }
  });

  return router;
}

function getCategoryPlaceholder(category: string): string {
  const placeholders: Record<string, string> = {
    Electronics: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
    Documents: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    Wallet: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
    Keys: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&auto=format&fit=crop&q=80',
    Books: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    Bags: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    Clothing: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&auto=format&fit=crop&q=80',
    Accessories: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
    'ID Cards': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=80',
    Other: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80'
  };
  return placeholders[category] || placeholders['Other'];
}
