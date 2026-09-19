import { Router, Response } from 'express';
import crypto from 'crypto';
import { DatabaseService } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';

export function createClaimsRouter(db: DatabaseService): Router {
  const router = Router();

  // Submit a claim on an item
  router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        itemId,
        locationLost,
        dateLost,
        identifyingDetails,
        proofNotes,
        contactShareConsent
      } = req.body;

      if (!itemId || !locationLost || !dateLost || !identifyingDetails) {
        return res.status(400).json({
          error: 'Item ID, location lost, date lost, and identifying characteristics are required.'
        });
      }

      const item = db.queryOne<any>('SELECT * FROM items WHERE id = ?', [itemId]);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      if (item.user_id === req.user!.id) {
        return res.status(400).json({ error: 'You cannot claim an item you reported yourself.' });
      }

      // Check if user already submitted a pending claim on this item
      const existingClaim = db.queryOne<any>(
        'SELECT id FROM claims WHERE item_id = ? AND claimant_id = ? AND status = "PENDING"',
        [itemId, req.user!.id]
      );
      if (existingClaim) {
        return res.status(409).json({ error: 'You already have a pending claim on this item.' });
      }

      const claimId = crypto.randomUUID();
      db.run(
        `INSERT INTO claims (
          id, item_id, claimant_id, status, location_lost, date_lost, 
          identifying_details, proof_notes, contact_share_consent
        ) VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)`,
        [
          claimId,
          itemId,
          req.user!.id,
          locationLost.trim(),
          dateLost.trim(),
          identifyingDetails.trim(),
          proofNotes?.trim() || null,
          contactShareConsent ? 1 : 0
        ]
      );

      // Update item status to CLAIM_PENDING if currently ACTIVE or MATCH_FOUND
      if (item.status === 'ACTIVE' || item.status === 'MATCH_FOUND') {
        db.run(`UPDATE items SET status = 'CLAIM_PENDING' WHERE id = ?`, [itemId]);
      }

      // Create notification for item reporter
      const notifId = crypto.randomUUID();
      db.run(
        `INSERT INTO notifications (id, user_id, type, title, message, link_url, is_read)
         VALUES (?, ?, 'CLAIM_RECEIVED', 'New Claim Submitted', ?, ?, 0)`,
        [
          notifId,
          item.user_id,
          `${req.user!.name} submitted an ownership claim for "${item.title}". Review their verification answers.`,
          `/claims`
        ]
      );

      return res.status(201).json({
        message: 'Claim submitted successfully. The reporter will review your verification details.',
        claimId
      });
    } catch (err: any) {
      console.error('Submit claim error:', err);
      return res.status(500).json({ error: 'Failed to submit claim.' });
    }
  });

  // Get claims submitted by the current user
  router.get('/my-claims', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const claims = db.query<any>(
        `SELECT 
          c.*,
          i.title as item_title,
          i.type as item_type,
          i.category as item_category,
          i.location as item_location,
          i.date as item_date,
          i.status as item_status,
          i.primary_image as item_image,
          u.name as reporter_name,
          u.campus as reporter_campus
        FROM claims c
        JOIN items i ON c.item_id = i.id
        JOIN users u ON i.user_id = u.id
        WHERE c.claimant_id = ?
        ORDER BY c.created_at DESC`,
        [req.user!.id]
      );

      return res.json({ claims });
    } catch (err: any) {
      console.error('Fetch my claims error:', err);
      return res.status(500).json({ error: 'Failed to retrieve claims.' });
    }
  });

  // Get claims received on items reported by the current user
  router.get('/received', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const claims = db.query<any>(
        `SELECT 
          c.*,
          i.title as item_title,
          i.type as item_type,
          i.category as item_category,
          i.location as item_location,
          i.status as item_status,
          i.primary_image as item_image,
          u.name as claimant_name,
          u.email as claimant_email,
          u.campus as claimant_campus,
          u.avatar as claimant_avatar
        FROM claims c
        JOIN items i ON c.item_id = i.id
        JOIN users u ON c.claimant_id = u.id
        WHERE i.user_id = ?
        ORDER BY c.created_at DESC`,
        [req.user!.id]
      );

      return res.json({ claims });
    } catch (err: any) {
      console.error('Fetch received claims error:', err);
      return res.status(500).json({ error: 'Failed to retrieve received claims.' });
    }
  });

  // Approve or reject a claim
  router.put('/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes } = req.body;

      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Status must be either APPROVED or REJECTED.' });
      }

      const claim = db.queryOne<any>(
        `SELECT c.*, i.user_id as item_owner_id, i.title as item_title, i.id as item_id
         FROM claims c
         JOIN items i ON c.item_id = i.id
         WHERE c.id = ?`,
        [id]
      );

      if (!claim) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      // Check permission: only item owner can approve/reject
      if (claim.item_owner_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'You are not authorized to manage this claim.' });
      }

      db.run(
        `UPDATE claims 
         SET status = ?, resolution_notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, resolutionNotes?.trim() || null, id]
      );

      if (status === 'APPROVED') {
        // Mark item as RESOLVED
        db.run(`UPDATE items SET status = 'RESOLVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [claim.item_id]);

        // Mark other pending claims on this item as REJECTED
        db.run(
          `UPDATE claims SET status = 'REJECTED', resolution_notes = 'Item resolved with another verified claimant.'
           WHERE item_id = ? AND id != ? AND status = 'PENDING'`,
          [claim.item_id, id]
        );

        // Notify claimant of approval
        db.run(
          `INSERT INTO notifications (id, user_id, type, title, message, link_url, is_read)
           VALUES (?, ?, 'CLAIM_APPROVED', 'Claim Approved! 🎉', ?, ?, 0)`,
          [
            crypto.randomUUID(),
            claim.claimant_id,
            `Your ownership claim for "${claim.item_title}" has been verified and approved by the reporter. You can now coordinate recovery!`,
            `/items/${claim.item_id}`
          ]
        );
      } else {
        // Check if there are other pending claims
        const otherPending = db.queryOne('SELECT id FROM claims WHERE item_id = ? AND status = "PENDING"', [claim.item_id]);
        const newStatus = otherPending ? 'CLAIM_PENDING' : 'ACTIVE';
        db.run(`UPDATE items SET status = ? WHERE id = ?`, [newStatus, claim.item_id]);

        // Notify claimant of rejection
        db.run(
          `INSERT INTO notifications (id, user_id, type, title, message, link_url, is_read)
           VALUES (?, ?, 'CLAIM_REJECTED', 'Claim Update', ?, ?, 0)`,
          [
            crypto.randomUUID(),
            claim.claimant_id,
            `Your claim for "${claim.item_title}" was not approved by the reporter.`,
            `/items/${claim.item_id}`
          ]
        );
      }

      return res.json({
        message: `Claim ${status.toLowerCase()} successfully.`,
        status
      });
    } catch (err: any) {
      console.error('Update claim status error:', err);
      return res.status(500).json({ error: 'Failed to update claim status.' });
    }
  });

  return router;
}
