import { Router, Response } from 'express';
import { DatabaseService } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';

export function createNotificationsRouter(db: DatabaseService): Router {
  const router = Router();

  // Get notifications for current user
  router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const notifications = db.query<any>(
        `SELECT * FROM notifications 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [req.user!.id]
      );

      const unreadCount = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
        [req.user!.id]
      )?.count || 0;

      return res.json({ notifications, unreadCount });
    } catch (err: any) {
      console.error('Fetch notifications error:', err);
      return res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
  });

  // Mark single notification as read
  router.put('/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      db.run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, req.user!.id]);
      return res.json({ message: 'Notification marked as read.' });
    } catch (err: any) {
      console.error('Mark read error:', err);
      return res.status(500).json({ error: 'Failed to mark notification as read.' });
    }
  });

  // Mark all notifications as read
  router.put('/read-all', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      db.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user!.id]);
      return res.json({ message: 'All notifications marked as read.' });
    } catch (err: any) {
      console.error('Mark all read error:', err);
      return res.status(500).json({ error: 'Failed to mark all as read.' });
    }
  });

  return router;
}
