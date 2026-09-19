import React, { useState } from 'react';
import { Item, PotentialMatch } from '../types/index.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { ShieldCheck, X, AlertCircle, Lock, CheckCircle2 } from 'lucide-react';

interface ClaimModalProps {
  item: Item | PotentialMatch;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClaimModal({ item, isOpen, onClose, onSuccess }: ClaimModalProps) {
  const { showToast } = useToast();
  const [locationLost, setLocationLost] = useState('');
  const [dateLost, setDateLost] = useState(new Date().toISOString().split('T')[0]);
  const [identifyingDetails, setIdentifyingDetails] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [contactConsent, setContactConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!locationLost.trim() || !dateLost || !identifyingDetails.trim()) {
      setError('Please fill in all mandatory verification fields.');
      return;
    }

    if (identifyingDetails.trim().length < 15) {
      setError('Please provide more specific identifying characteristics to verify ownership.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitClaim({
        itemId: item.id,
        locationLost: locationLost.trim(),
        dateLost,
        identifyingDetails: identifyingDetails.trim(),
        proofNotes: proofNotes.trim() || undefined,
        contactShareConsent: contactConsent
      });

      showToast({
        type: 'success',
        title: 'Claim Submitted Successfully',
        message: 'Your verification answers have been sent to the finder for review.'
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim. Please try again.');
      showToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Could not submit claim.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102018]/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white border border-[#E3ECE6] shadow-[0_24px_48px_-12px_rgba(22,138,74,0.16),0_12px_24px_-6px_rgba(16,32,24,0.06)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#E3ECE6] flex items-start justify-between bg-[#F7FBF8]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] shadow-sm">
              <ShieldCheck className="w-6 h-6 text-[#35B86B]" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#102018]">Verify That This is Your Item</h3>
              <p className="text-xs text-[#66756C] font-medium">Claiming: <span className="text-[#168A4A] font-bold">{item.title}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#66756C] hover:text-[#102018] hover:bg-[#EEF8F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] text-[#E11D48] text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Privacy & Anti-Fraud Notice */}
          <div className="p-3.5 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] text-xs text-[#2D3D34] flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#35B86B] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-[#168A4A]">Campus Verification Standard: </span>
              Answer the questions below accurately to help the finder confirm that this property belongs to you.
            </div>
          </div>

          {/* Location Lost */}
          <div>
            <label className="block text-xs font-bold text-[#102018] mb-1.5">
              Where on campus did you lose this item? <span className="text-[#E11D48]">*</span>
            </label>
            <input
              type="text"
              required
              value={locationLost}
              onChange={(e) => setLocationLost(e.target.value)}
              placeholder="e.g. Main Library 3rd Floor study pods near window"
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20"
            />
          </div>

          {/* Date Lost */}
          <div>
            <label className="block text-xs font-bold text-[#102018] mb-1.5">
              When did you lose it? <span className="text-[#E11D48]">*</span>
            </label>
            <input
              type="date"
              required
              value={dateLost}
              onChange={(e) => setDateLost(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20"
            />
          </div>

          {/* Distinctive Characteristics */}
          <div>
            <label className="block text-xs font-bold text-[#102018] mb-1.5">
              Specific Identifying Marks or Hidden Details <span className="text-[#E11D48]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={identifyingDetails}
              onChange={(e) => setIdentifyingDetails(e.target.value)}
              placeholder="Describe unique scratches, stickers, internal contents, lockscreen text, or engraved initials not mentioned publicly."
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20 resize-none"
            />
            <p className="text-[11px] text-[#66756C] mt-1 font-medium">This information is only visible to the finder for verification.</p>
          </div>

          {/* Proof / Invoice notes */}
          <div>
            <label className="block text-xs font-bold text-[#102018] mb-1.5">
              Additional Proof or Verification Notes (Optional)
            </label>
            <input
              type="text"
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              placeholder="e.g. Serial number ending in 8X9Q, Apple ID screenshot, or student ID match"
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20"
            />
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={contactConsent}
              onChange={(e) => setContactConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#35B86B] focus:ring-0 border-[#E3ECE6]"
            />
            <span className="text-xs text-[#66756C] leading-snug font-medium">
              I authorize FindIt AI to safely share my campus name and in-app contact with the finder upon claim approval.
            </span>
          </label>

          {/* Actions */}
          <div className="pt-4 border-t border-[#E3ECE6] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#66756C] hover:text-[#102018] hover:bg-[#F7FBF8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting Verification...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Verification Claim</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
