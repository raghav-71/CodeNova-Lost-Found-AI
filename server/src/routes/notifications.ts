import { Router, Response } from 'express';
import { supabaseDb } from '../db/supabaseDb.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';

export function createNotificationsRouter(): Router {
  const router = Router();

  // Get notifications for current user (isolated)
  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { notifications, unreadCount } = await supabaseDb.getNotifications(req.user!.id);
      return res.json({ notifications, unreadCount });
    } catch (err: any) {
      console.error('Fetch notifications error:', err);
      return res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
  });

  // Mark single notification as read
  router.put('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await supabaseDb.markNotificationRead(id, req.user!.id);
      if (!updated) {
        return res.status(404).json({ error: 'Notification not found or access denied.' });
      }
      return res.json({ message: 'Notification marked as read.' });
    } catch (err: any) {
      console.error('Mark read error:', err);
      return res.status(500).json({ error: 'Failed to mark notification as read.' });
    }
  });

  // Mark all notifications as read
  router.put('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const count = await supabaseDb.markAllNotificationsRead(req.user!.id);
      return res.json({ message: 'All notifications marked as read.', updatedCount: count });
    } catch (err: any) {
      console.error('Mark all read error:', err);
      return res.status(500).json({ error: 'Failed to mark all as read.' });
    }
  });

  return router;
}
