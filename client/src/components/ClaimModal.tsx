import React, { useState } from 'react';
import { Item, PotentialMatch } from '../types/index.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { ShieldCheck, X, AlertCircle, Send, CheckCircle2 } from 'lucide-react';

interface ClaimModalProps {
  item: Item | PotentialMatch;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClaimModal({ item, isOpen, onClose, onSuccess }: ClaimModalProps) {
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.submitClaim({
        itemId: item.id,
        message: message.trim() || undefined
      });

      showToast({
        type: 'success',
        title: 'Claim Request Sent',
        message: 'The finder has been notified. Check Claims to follow up.'
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

  const itemImage = 'image_url' in item ? item.image_url : (item as any).imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#102018]/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-[#E3ECE6] shadow-[0_24px_48px_-12px_rgba(22,138,74,0.16),0_12px_24px_-6px_rgba(16,32,24,0.06)] overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#E3ECE6] flex items-start justify-between bg-[#F7FBF8] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 pr-2">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#35B86B]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-[#102018] truncate">Claim this item?</h3>
              <p className="text-xs text-[#66756C] font-medium">This will notify the person who reported finding it.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#66756C] hover:text-[#102018] hover:bg-[#EEF8F1] transition-colors shrink-0 touch-target flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Confirmation */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] text-[#E11D48] text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Preview Card */}
          <div className="p-3.5 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] flex items-center gap-3">
            {itemImage ? (
              <img
                src={itemImage}
                alt={item.title}
                className="w-14 h-14 rounded-xl object-cover border border-[#E3ECE6] shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] font-bold text-xs shrink-0">
                {item.category?.slice(0, 3).toUpperCase() || 'ITEM'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[#102018] truncate">{item.title}</h4>
              <p className="text-xs text-[#66756C] truncate mt-0.5">
                {item.location} • {item.category}
              </p>
              {(item as any).color && (
                <span className="inline-block mt-1 text-[11px] font-semibold text-[#168A4A] bg-[#EEF8F1] px-2 py-0.5 rounded-md">
                  {String((item as any).color)}
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] text-xs text-[#2D3D34] leading-relaxed">
            <span className="font-bold text-[#168A4A]">Simple Claim Process: </span>
            Once submitted, the finder will be able to review your claim and approve handover. You will be able to contact each other directly once approved.
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-[#102018] mb-1.5">
              Optional note for the finder
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., Hi! I lost this near the library yesterday afternoon. Thanks so much for finding it!"
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20 resize-none"
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E3ECE6] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#66756C] hover:text-[#102018] hover:bg-[#F7FBF8] transition-colors touch-target text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold disabled:opacity-50 touch-target"
            >
              {isSubmitting ? (
                <span>Submitting Claim...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirm Claim</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
