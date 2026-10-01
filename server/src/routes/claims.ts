import { Router, Response } from 'express';
import crypto from 'crypto';
import { supabaseDb } from '../db/supabaseDb.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';
import { claimLimiter } from '../middleware/rateLimiters.js';
import { validateClaim, sanitizeString } from '../middleware/validation.js';

export function createClaimsRouter(): Router {
  const router = Router();

  // Submit a claim on an item
  router.post('/', claimLimiter, authenticateToken, validateClaim, async (req: AuthenticatedRequest, res: Response) => {
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

      if (String(identifyingDetails).trim().length < 10) {
        return res.status(400).json({
          error: 'Please provide detailed identifying characteristics (at least 10 characters).'
        });
      }

      const item = await supabaseDb.getItemById(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      // Business Rule 1: Claims can only be submitted for FOUND items
      if (item.type !== 'FOUND') {
        return res.status(400).json({
          error: 'Claims can only be submitted for items reported as FOUND.'
        });
      }

      // Business Rule 2: Cannot claim an already resolved or closed item
      if (item.status === 'RESOLVED' || item.status === 'CLOSED') {
        return res.status(400).json({
          error: 'This item has already been resolved or returned.'
        });
      }

      // Business Rule 3: User cannot claim their own reported item (Exact error match)
      if (item.user_id === req.user!.id) {
        return res.status(400).json({
          error: 'You cannot claim your own reported item.'
        });
      }

      // Business Rule 4: Prevent duplicate active (PENDING or APPROVED) claims
      const existingClaim = await supabaseDb.getActiveClaim(itemId, req.user!.id);
      if (existingClaim) {
        return res.status(409).json({
          error: 'You already have an active claim on this item.'
        });
      }

      // Ensure profile exists for claimant
      let profile = await supabaseDb.getProfile(req.user!.id);
      if (!profile) {
        await supabaseDb.upsertProfile({
          id: req.user!.id,
          full_name: req.user!.name,
          email: req.user!.email,
          college: req.user!.campus,
          avatar_url: req.user!.avatar,
          phone: req.user!.phone
        });
      }

      const claimId = crypto.randomUUID();
      await supabaseDb.createClaim({
        id: claimId,
        item_id: itemId,
        claimant_id: req.user!.id,
        status: 'PENDING',
        location_lost: locationLost.trim(),
        date_lost: dateLost.trim(),
        identifying_details: identifyingDetails.trim(),
        proof_notes: proofNotes?.trim() || undefined,
        contact_share_consent: Boolean(contactShareConsent)
      });

      // Update item status to CLAIM_PENDING if currently ACTIVE or MATCH_FOUND
      if (item.status === 'ACTIVE' || item.status === 'MATCH_FOUND') {
        await supabaseDb.updateItem(itemId, item.user_id, { status: 'CLAIM_PENDING' });
      }

      // Create notification for item reporter / finder
      await supabaseDb.createNotification({
        id: crypto.randomUUID(),
        user_id: item.user_id,
        type: 'CLAIM_RECEIVED',
        title: 'New Claim Submitted',
        message: `${req.user!.name} submitted an ownership claim for "${item.title}". Review their verification answers.`,
        link_url: `/claims`,
        related_item_id: itemId,
        related_claim_id: claimId,
        is_read: false
      });

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
  router.get('/my-claims', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const claims = await supabaseDb.getClaimsSubmittedByUser(req.user!.id);
      return res.json({ claims });
    } catch (err: any) {
      console.error('Fetch my claims error:', err);
      return res.status(500).json({ error: 'Failed to retrieve claims.' });
    }
  });

  // Get claims received on items reported by the current user
  router.get('/received', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const claims = await supabaseDb.getClaimsReceivedByUser(req.user!.id);
      return res.json({ claims });
    } catch (err: any) {
      console.error('Fetch received claims error:', err);
      return res.status(500).json({ error: 'Failed to retrieve received claims.' });
    }
  });

  // Approve or reject a claim
  router.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes } = req.body;

      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Status must be either APPROVED or REJECTED.' });
      }

      const claim = await supabaseDb.getClaimById(id);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      // Check authorization: only item owner / finder can approve/reject
      if (claim.item_owner_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'You are not authorized to manage this claim.' });
      }

      await supabaseDb.updateClaimStatus(id, status, resolutionNotes?.trim());

      if (status === 'APPROVED') {
        // Notify claimant of approval
        await supabaseDb.createNotification({
          id: crypto.randomUUID(),
          user_id: claim.claimant_id,
          type: 'CLAIM_APPROVED',
          title: 'Claim Approved! 🎉',
          message: `Your ownership claim for "${claim.item_title}" has been verified and approved by the reporter. You can now coordinate recovery!`,
          link_url: `/items/${claim.item_id}`,
          related_item_id: claim.item_id,
          related_claim_id: claim.id,
          is_read: false
        });

        // Also notify the finder of successful resolution
        await supabaseDb.createNotification({
          id: crypto.randomUUID(),
          user_id: claim.item_owner_id!,
          type: 'CLAIM_APPROVED',
          title: 'Item Claim Resolved! 🎉',
          message: `You approved the claim for "${claim.item_title}". The item is now marked as RESOLVED.`,
          link_url: `/items/${claim.item_id}`,
          related_item_id: claim.item_id,
          related_claim_id: claim.id,
          is_read: false
        });
      } else {
        // Notify claimant of rejection
        await supabaseDb.createNotification({
          id: crypto.randomUUID(),
          user_id: claim.claimant_id,
          type: 'CLAIM_REJECTED',
          title: 'Claim Update',
          message: `Your claim for "${claim.item_title}" was not approved by the reporter.`,
          link_url: `/items/${claim.item_id}`,
          related_item_id: claim.item_id,
          related_claim_id: claim.id,
          is_read: false
        });
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
