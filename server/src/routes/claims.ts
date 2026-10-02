import { Router, Response } from 'express';
import crypto from 'crypto';
import { supabaseDb } from '../db/supabaseDb.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';
import { claimLimiter } from '../middleware/rateLimiters.js';
import { validateClaim } from '../middleware/validation.js';

export function createClaimsRouter(): Router {
  const router = Router();

  /**
   * POST /api/claims
   * Simplified Claim Submission — only itemId required
   */
  router.post('/', claimLimiter, authenticateToken, validateClaim, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        itemId,
        message,
        locationLost,
        dateLost,
        identifyingDetails,
        proofNotes,
        contactShareConsent = true
      } = req.body;

      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required.' });
      }

      const item = await supabaseDb.getItemById(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      // Rule 1: Claims can only be submitted for FOUND items
      if (item.type !== 'FOUND') {
        return res.status(400).json({
          error: 'Claims can only be submitted for items reported as FOUND.'
        });
      }

      // Rule 2: Cannot claim an already resolved or closed item
      if (item.status === 'RESOLVED' || item.status === 'CLOSED') {
        return res.status(400).json({
          error: 'This item has already been resolved or returned.'
        });
      }

      // Rule 3: Self-claim check (User cannot claim their own reported found item)
      if (item.user_id === req.user!.id) {
        return res.status(400).json({
          error: 'You cannot claim an item you reported as found.'
        });
      }

      // Rule 4: Prevent duplicate active (PENDING or APPROVED) claims
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
      const newClaim = await supabaseDb.createClaim({
        id: claimId,
        item_id: itemId,
        claimant_id: req.user!.id,
        status: 'PENDING',
        message: message?.trim() || undefined,
        location_lost: locationLost?.trim() || item.location,
        date_lost: dateLost?.trim() || item.date,
        identifying_details: identifyingDetails?.trim() || (message?.trim() ? `Note: ${message.trim()}` : 'Direct claim from matching lost report.'),
        proof_notes: proofNotes?.trim() || undefined,
        contact_share_consent: Boolean(contactShareConsent)
      });

      // Update item status to CLAIM_PENDING
      if (item.status === 'ACTIVE' || item.status === 'MATCH_FOUND') {
        await supabaseDb.updateItem(itemId, item.user_id, { status: 'CLAIM_PENDING' });
      }

      // Notify the finder that someone claimed their found item
      await supabaseDb.createNotification({
        id: crypto.randomUUID(),
        user_id: item.user_id,
        type: 'CLAIM_RECEIVED',
        title: 'Someone claimed an item you reported',
        message: `${req.user!.name} submitted a claim for "${item.title}".`,
        link_url: `/claims`,
        related_item_id: itemId,
        related_claim_id: claimId,
        is_read: false
      });

      return res.status(201).json({
        message: 'Claim submitted successfully. The finder has been notified.',
        claimId,
        claim: newClaim
      });
    } catch (err: any) {
      console.error('Submit claim error:', err);
      return res.status(500).json({ error: 'Failed to submit claim.' });
    }
  });

  /**
   * GET /api/claims/my-claims
   * Get claims submitted by the current user
   */
  router.get('/my-claims', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const claims = await supabaseDb.getClaimsSubmittedByUser(req.user!.id);
      return res.json({ claims });
    } catch (err: any) {
      console.error('Fetch my claims error:', err);
      return res.status(500).json({ error: 'Failed to retrieve claims.' });
    }
  });

  router.get('/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const claims = await supabaseDb.getClaimsSubmittedByUser(req.user!.id);
      return res.json({ claims });
    } catch (err: any) {
      console.error('Fetch my claims error:', err);
      return res.status(500).json({ error: 'Failed to retrieve claims.' });
    }
  });

  /**
   * GET /api/claims/received
   * Get claims received on items reported as found by the current user
   */
  router.get('/received', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const claims = await supabaseDb.getClaimsReceivedByUser(req.user!.id);
      return res.json({ claims });
    } catch (err: any) {
      console.error('Fetch received claims error:', err);
      return res.status(500).json({ error: 'Failed to retrieve received claims.' });
    }
  });

  /**
   * PUT /api/claims/:id/status
   * Update claim status: APPROVED, REJECTED, or RESOLVED
   */
  router.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes } = req.body;

      if (!['APPROVED', 'REJECTED', 'RESOLVED'].includes(status)) {
        return res.status(400).json({ error: 'Status must be APPROVED, REJECTED, or RESOLVED.' });
      }

      const claim = await supabaseDb.getClaimById(id);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      const isFinder = claim.item_owner_id === req.user!.id || req.user!.role === 'admin';
      const isClaimant = claim.claimant_id === req.user!.id;

      // Approval / Rejection can only be performed by the finder
      if ((status === 'APPROVED' || status === 'REJECTED') && !isFinder) {
        return res.status(403).json({ error: 'You are not authorized to approve or reject this claim.' });
      }

      // Resolution can be confirmed by either claimant or finder
      if (status === 'RESOLVED' && !isFinder && !isClaimant) {
        return res.status(403).json({ error: 'You are not authorized to mark this item as resolved.' });
      }

      await supabaseDb.updateClaimStatus(id, status, resolutionNotes?.trim());

      if (status === 'APPROVED') {
        // Notify claimant: "Your claim was approved. Contact the finder to collect your item."
        await supabaseDb.createNotification({
          id: crypto.randomUUID(),
          user_id: claim.claimant_id,
          type: 'CLAIM_APPROVED',
          title: 'Claim Approved! 🎉',
          message: 'Your claim was approved. Contact the finder to collect your item.',
          link_url: `/claims`,
          related_item_id: claim.item_id,
          related_claim_id: claim.id,
          is_read: false
        });
      } else if (status === 'REJECTED') {
        // Notify claimant: "Your claim was rejected."
        await supabaseDb.createNotification({
          id: crypto.randomUUID(),
          user_id: claim.claimant_id,
          type: 'CLAIM_REJECTED',
          title: 'Claim Update',
          message: 'Your claim was rejected.',
          link_url: `/claims`,
          related_item_id: claim.item_id,
          related_claim_id: claim.id,
          is_read: false
        });
      } else if (status === 'RESOLVED') {
        // Notify both parties: "Item marked as returned."
        const otherUserId = isClaimant ? claim.item_owner_id! : claim.claimant_id;
        await supabaseDb.createNotification({
          id: crypto.randomUUID(),
          user_id: otherUserId,
          type: 'CLAIM_APPROVED',
          title: 'Item Returned! 🎉',
          message: 'Item marked as returned.',
          link_url: `/items/${claim.item_id}`,
          related_item_id: claim.item_id,
          related_claim_id: claim.id,
          is_read: false
        });
      }

      const updatedClaim = await supabaseDb.getClaimById(id);
      return res.json({
        message: `Claim ${status.toLowerCase()} successfully.`,
        status,
        claim: updatedClaim
      });
    } catch (err: any) {
      console.error('Update claim status error:', err);
      return res.status(500).json({ error: 'Failed to update claim status.' });
    }
  });

  /**
   * POST /api/claims/:id/resolve
   * "I Received My Item" / Handover Confirmed endpoint
   */
  router.post('/:id/resolve', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { resolutionNotes } = req.body;

      const claim = await supabaseDb.getClaimById(id);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      const isFinder = claim.item_owner_id === req.user!.id || req.user!.role === 'admin';
      const isClaimant = claim.claimant_id === req.user!.id;

      if (!isFinder && !isClaimant) {
        return res.status(403).json({ error: 'You are not authorized to resolve this claim.' });
      }

      if (claim.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Only approved claims can be marked as received/resolved.' });
      }

      await supabaseDb.updateClaimStatus(id, 'RESOLVED', resolutionNotes?.trim() || 'Item successfully received by owner.');

      const otherUserId = isClaimant ? claim.item_owner_id! : claim.claimant_id;
      await supabaseDb.createNotification({
        id: crypto.randomUUID(),
        user_id: otherUserId,
        type: 'CLAIM_APPROVED',
        title: 'Item Returned! 🎉',
        message: 'Item marked as returned.',
        link_url: `/items/${claim.item_id}`,
        related_item_id: claim.item_id,
        related_claim_id: claim.id,
        is_read: false
      });

      const updatedClaim = await supabaseDb.getClaimById(id);
      return res.json({
        message: 'Item successfully returned.',
        status: 'RESOLVED',
        claim: updatedClaim
      });
    } catch (err: any) {
      console.error('Resolve claim error:', err);
      return res.status(500).json({ error: 'Failed to resolve claim.' });
    }
  });

  /**
   * POST /api/claims/:id/cancel
   * Claimant cancels their pending claim
   */
  router.post('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const claim = await supabaseDb.getClaimById(id);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      if (claim.claimant_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'You are not authorized to cancel this claim.' });
      }

      if (claim.status === 'RESOLVED') {
        return res.status(400).json({ error: 'Resolved claims cannot be cancelled.' });
      }

      await supabaseDb.updateClaimStatus(id, 'CANCELLED', 'Cancelled by claimant.');

      const updatedClaim = await supabaseDb.getClaimById(id);
      return res.json({
        message: 'Claim cancelled successfully.',
        status: 'CANCELLED',
        claim: updatedClaim
      });
    } catch (err: any) {
      console.error('Cancel claim error:', err);
      return res.status(500).json({ error: 'Failed to cancel claim.' });
    }
  });

  return router;
}
