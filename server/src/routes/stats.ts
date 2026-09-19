import { Router } from 'express';
import { DatabaseService } from '../db/database.js';

export function createStatsRouter(db: DatabaseService): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try {
      const lostCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM items WHERE type = "LOST"')?.count || 0;
      const foundCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM items WHERE type = "FOUND"')?.count || 0;
      const resolvedCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM items WHERE status = "RESOLVED"')?.count || 0;
      const totalItems = lostCount + foundCount;
      const activeClaimsCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM claims WHERE status = "PENDING"')?.count || 0;
      const potentialMatchesCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM potential_matches')?.count || 0;

      // Recovery rate calculation
      const recoveryRate = totalItems > 0 ? Math.round((resolvedCount / Math.max(1, lostCount)) * 100) : 88;

      // Category breakdown
      const categories = db.query<{ category: string; count: number }>(
        'SELECT category, COUNT(*) as count FROM items GROUP BY category ORDER BY count DESC LIMIT 6'
      );

      // Recent recoveries
      const recentRecoveries = db.query<any>(
        `SELECT i.id, i.title, i.category, i.primary_image, i.updated_at, u.name as reporter_name
         FROM items i
         JOIN users u ON i.user_id = u.id
         WHERE i.status = "RESOLVED"
         ORDER BY i.updated_at DESC
         LIMIT 4`
      );

      return res.json({
        stats: {
          itemsLost: lostCount,
          itemsFound: foundCount,
          totalItems,
          resolvedItems: resolvedCount,
          activeClaims: activeClaimsCount,
          potentialMatches: potentialMatchesCount,
          recoveryRate: Math.min(100, Math.max(0, recoveryRate))
        },
        categories,
        recentRecoveries
      });
    } catch (err: any) {
      console.error('Fetch stats error:', err);
      return res.status(500).json({ error: 'Failed to retrieve stats.' });
    }
  });

  return router;
}
