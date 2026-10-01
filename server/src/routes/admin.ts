import { Router, Response } from 'express';
import { supabaseDb } from '../db/supabaseDb.js';
import { AuthenticatedRequest, authenticateToken, requireAdmin } from '../middleware/auth.js';
import { supabaseAdmin, isSupabaseServerConfigured } from '../services/supabase.js';

export function createAdminRouter(): Router {
  const router = Router();

  // Enforce authentication + server-side admin role on all admin routes
  router.use(authenticateToken);
  router.use(requireAdmin);

  // Administrative System Overview
  router.get('/overview', async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await supabaseDb.getCampusStats();
      let totalUsers = 0;

      if (isSupabaseServerConfigured) {
        try {
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true });
          totalUsers = count || 0;
        } catch (e) {
          console.warn('Failed to count profiles:', e);
        }
      }

      return res.json({
        systemStatus: 'healthy',
        overview: {
          totalUsers,
          ...stats
        }
      });
    } catch (err: any) {
      console.error('Admin overview error:', err);
      return res.status(500).json({ error: 'Failed to retrieve administrative overview.' });
    }
  });

  // Admin list all items (with unfiltered pagination)
  router.get('/items', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const { items, total } = await supabaseDb.getItems({
        limit: Math.min(Number(limit), 200),
        offset: Number(offset)
      });

      return res.json({ items, total });
    } catch (err: any) {
      console.error('Admin fetch items error:', err);
      return res.status(500).json({ error: 'Failed to retrieve items.' });
    }
  });

  // Admin delete any item
  router.delete('/items/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const item = await supabaseDb.getItemById(id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      // Admin bypasses item owner check
      const deleted = await supabaseDb.deleteItem(id, item.user_id);
      if (!deleted) {
        return res.status(500).json({ error: 'Failed to delete item.' });
      }

      return res.json({ message: 'Item deleted by administrator.' });
    } catch (err: any) {
      console.error('Admin delete item error:', err);
      return res.status(500).json({ error: 'Failed to delete item.' });
    }
  });

  return router;
}
