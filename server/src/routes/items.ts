import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { DatabaseService } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken, optionalAuthenticateToken } from '../middleware/auth.js';
import { aiMatchingService, ItemRecord } from '../services/aiMatcher.js';

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

export function createItemsRouter(db: DatabaseService): Router {
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
      const candidates = await aiMatchingService.findCandidatesForIntent(db, intent, type);

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
  router.get('/', optionalAuthenticateToken, (req: AuthenticatedRequest, res: Response) => {
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

      let conditions: string[] = [];
      let params: any[] = [];

      if (type && type !== 'ALL') {
        conditions.push('i.type = ?');
        params.push(String(type).toUpperCase());
      }

      if (category && category !== 'ALL') {
        conditions.push('i.category = ?');
        params.push(String(category));
      }

      if (location && location !== 'ALL') {
        conditions.push('(i.location LIKE ? OR i.building_zone LIKE ?)');
        params.push(`%${location}%`, `%${location}%`);
      }

      if (status && status !== 'ALL') {
        conditions.push('i.status = ?');
        params.push(String(status).toUpperCase());
      }

      if (userId) {
        conditions.push('i.user_id = ?');
        params.push(String(userId));
      }

      if (q && String(q).trim().length > 0) {
        const searchTerm = `%${String(q).trim()}%`;
        conditions.push('(i.title LIKE ? OR i.description LIKE ? OR i.category LIKE ? OR i.location LIKE ? OR i.characteristics LIKE ?)');
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      let orderBy = 'ORDER BY i.created_at DESC';
      if (sort === 'oldest') {
        orderBy = 'ORDER BY i.created_at ASC';
      } else if (sort === 'date_desc') {
        orderBy = 'ORDER BY i.date DESC, i.created_at DESC';
      }

      const sql = `
        SELECT 
          i.*,
          u.name as reporter_name,
          u.campus as reporter_campus,
          u.avatar as reporter_avatar,
          (SELECT COUNT(*) FROM potential_matches pm WHERE pm.lost_item_id = i.id OR pm.found_item_id = i.id) as potential_matches_count,
          (SELECT MAX(match_score) FROM potential_matches pm WHERE pm.lost_item_id = i.id OR pm.found_item_id = i.id) as top_match_score,
          (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id) as claims_count
        FROM items i
        JOIN users u ON i.user_id = u.id
        ${whereClause}
        ${orderBy}
        LIMIT ? OFFSET ?
      `;

      params.push(Number(limit), Number(offset));
      const items = db.query(sql, params);

      // Total count query
      const countSql = `SELECT COUNT(*) as total FROM items i ${whereClause}`;
      const countParams = params.slice(0, -2);
      const totalResult = db.queryOne<{ total: number }>(countSql, countParams);

      return res.json({
        items,
        total: totalResult?.total || items.length,
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (err: any) {
      console.error('Fetch items error:', err);
      return res.status(500).json({ error: 'Failed to retrieve items.' });
    }
  });

  // Get item by ID
  router.get('/:id', optionalAuthenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const item = db.queryOne<any>(
        `SELECT 
          i.*,
          u.name as reporter_name,
          u.campus as reporter_campus,
          u.avatar as reporter_avatar,
          (SELECT COUNT(*) FROM potential_matches pm WHERE pm.lost_item_id = i.id OR pm.found_item_id = i.id) as potential_matches_count,
          (SELECT MAX(match_score) FROM potential_matches pm WHERE pm.lost_item_id = i.id OR pm.found_item_id = i.id) as top_match_score
        FROM items i
        JOIN users u ON i.user_id = u.id
        WHERE i.id = ?`,
        [id]
      );

      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const images = db.query<{ id: string; image_url: string }>('SELECT id, image_url FROM item_images WHERE item_id = ?', [id]);

      // Check if current user is the owner
      const isOwner = req.user?.id === item.user_id;

      // Fetch potential matches for this item
      const isLost = item.type === 'LOST';
      const matchesSql = isLost
        ? `SELECT 
             pm.id as match_id,
             pm.match_score,
             pm.match_reasons,
             pm.matched_features,
             pm.ai_evaluated,
             pm.status as match_status,
             other.*,
             u.name as reporter_name,
             u.campus as reporter_campus
           FROM potential_matches pm
           JOIN items other ON pm.found_item_id = other.id
           JOIN users u ON other.user_id = u.id
           WHERE pm.lost_item_id = ?
           ORDER BY pm.match_score DESC`
        : `SELECT 
             pm.id as match_id,
             pm.match_score,
             pm.match_reasons,
             pm.matched_features,
             pm.ai_evaluated,
             pm.status as match_status,
             other.*,
             u.name as reporter_name,
             u.campus as reporter_campus
           FROM potential_matches pm
           JOIN items other ON pm.lost_item_id = other.id
           JOIN users u ON other.user_id = u.id
           WHERE pm.found_item_id = ?
           ORDER BY pm.match_score DESC`;

      const matches = db.query<any>(matchesSql, [id]).map(m => ({
        ...m,
        match_reasons: JSON.parse(m.match_reasons || '[]'),
        matched_features: JSON.parse(m.matched_features || '[]')
      }));

      // Fetch claims on this item if owner, or check if logged in user has a claim
      let userClaim: any = null;
      let allClaims: any[] = [];

      if (req.user) {
        userClaim = db.queryOne('SELECT * FROM claims WHERE item_id = ? AND claimant_id = ?', [id, req.user.id]);
        if (isOwner) {
          allClaims = db.query(
            `SELECT c.*, u.name as claimant_name, u.email as claimant_email, u.campus as claimant_campus, u.avatar as claimant_avatar
             FROM claims c
             JOIN users u ON c.claimant_id = u.id
             WHERE c.item_id = ?
             ORDER BY c.created_at DESC`,
            [id]
          );
        }
      }

      return res.json({
        item: {
          ...item,
          images
        },
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
        imageUrl
      } = req.body;

      if (!type || !['LOST', 'FOUND'].includes(type.toUpperCase())) {
        return res.status(400).json({ error: 'Type must be either LOST or FOUND.' });
      }

      if (!title || !category || !description || !location || !date) {
        return res.status(400).json({ error: 'Title, category, description, location and date are required.' });
      }

      const itemId = crypto.randomUUID();
      const userId = req.user!.id;

      // Determine primary image
      let primaryImage = '';
      if (req.file) {
        primaryImage = `/uploads/${req.file.filename}`;
      } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
        primaryImage = imageUrl.trim();
      } else {
        // Fallback category visual
        primaryImage = getCategoryPlaceholder(category);
      }

      db.run(
        `INSERT INTO items (
          id, user_id, type, title, description, category, location, 
          building_zone, date, time, status, primary_image, characteristics
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
        [
          itemId,
          userId,
          type.toUpperCase(),
          title.trim(),
          description.trim(),
          category.trim(),
          location.trim(),
          building_zone?.trim() || null,
          date.trim(),
          time?.trim() || null,
          primaryImage,
          characteristics?.trim() || null
        ]
      );

      // Also record image in item_images table
      if (primaryImage) {
        db.run(
          `INSERT INTO item_images (id, item_id, image_url) VALUES (?, ?, ?)`,
          [crypto.randomUUID(), itemId, primaryImage]
        );
      }

      const createdItem: ItemRecord = {
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
        characteristics: characteristics?.trim() || undefined
      };

      // Run AI potential matching pipeline
      let matchesCount = 0;
      try {
        matchesCount = await aiMatchingService.findMatchesForItem(db, createdItem);
      } catch (matchErr) {
        console.warn('Matching pipeline error:', matchErr);
      }

      // Fetch fresh item data
      const finalItem = db.queryOne('SELECT * FROM items WHERE id = ?', [itemId]);

      return res.status(201).json({
        message: `${type === 'LOST' ? 'Lost' : 'Found'} item reported successfully.`,
        item: finalItem,
        matchesFound: matchesCount
      });
    } catch (err: any) {
      console.error('Create item error:', err);
      return res.status(500).json({ error: 'Failed to create item report.' });
    }
  });

  // Update item
  router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, category, location, building_zone, date, time, status, characteristics } = req.body;

      const item = db.queryOne<any>('SELECT * FROM items WHERE id = ?', [id]);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      if (item.user_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'You are not authorized to update this item.' });
      }

      db.run(
        `UPDATE items 
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             category = COALESCE(?, category),
             location = COALESCE(?, location),
             building_zone = COALESCE(?, building_zone),
             date = COALESCE(?, date),
             time = COALESCE(?, time),
             status = COALESCE(?, status),
             characteristics = COALESCE(?, characteristics),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [title || null, description || null, category || null, location || null, building_zone || null, date || null, time || null, status || null, characteristics || null, id]
      );

      const updated = db.queryOne('SELECT * FROM items WHERE id = ?', [id]);
      return res.json({ message: 'Item updated successfully', item: updated });
    } catch (err: any) {
      console.error('Update item error:', err);
      return res.status(500).json({ error: 'Failed to update item.' });
    }
  });

  // Delete item
  router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const item = db.queryOne<any>('SELECT * FROM items WHERE id = ?', [id]);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      if (item.user_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'You are not authorized to delete this item.' });
      }

      db.run('DELETE FROM items WHERE id = ?', [id]);
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
      const item = db.queryOne<any>('SELECT * FROM items WHERE id = ?', [id]);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const matchesCount = await aiMatchingService.findMatchesForItem(db, item);
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
