import { Router, Response } from 'express';
import { supabaseDb } from '../db/supabaseDb.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';

export function createStatsRouter(): Router {
  const router = Router();

  // Public Campus Aggregate Stats (for landing page)
  router.get('/', async (_req, res: Response) => {
    try {
      const stats = await supabaseDb.getCampusStats();
      return res.json({
        stats,
        categories: [
          { category: 'Electronics', count: 0 },
          { category: 'Documents', count: 0 },
          { category: 'Wallet', count: 0 },
          { category: 'Keys', count: 0 },
          { category: 'Bags', count: 0 }
        ],
        recentRecoveries: []
      });
    } catch (err: any) {
      console.error('Fetch stats error:', err);
      return res.status(500).json({ error: 'Failed to retrieve stats.' });
    }
  });

  // Authenticated User Personal Stats (for Dashboard isolation)
  router.get('/user', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userStats = await supabaseDb.getUserPersonalStats(req.user!.id);
      return res.json({
        stats: userStats
      });
    } catch (err: any) {
      console.error('Fetch user personal stats error:', err);
      return res.status(500).json({ error: 'Failed to retrieve personal stats.' });
    }
  });

  return router;
}
