import React from 'react';
import { AlertTriangle, Info, CheckCircle2, Edit3, ArrowRight, ShieldAlert, Sparkles, X } from 'lucide-react';
import { ConsistencyCheckResult } from '../types/index.js';

interface MultimodalMismatchModalProps {
  isOpen: boolean;
  consistency: ConsistencyCheckResult;
  onEditDetails: () => void;
  onContinueAnyway: () => void;
  onClose?: () => void;
  isSubmitting?: boolean;
}

export function MultimodalMismatchModal({
  isOpen,
  consistency,
  onEditDetails,
  onContinueAnyway,
  onClose,
  isSubmitting = false
}: MultimodalMismatchModalProps) {
  if (!isOpen) return null;

  const isMajor = consistency.consistency_level === 'MAJOR_MISMATCH';
  const userText = consistency.user_summary;
  const imageObs = consistency.image_summary;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E3ECE6] space-y-6 animate-in fade-in zoom-in duration-200">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#94A39B] hover:text-[#102018] rounded-full hover:bg-[#F7FBF8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-2xl shrink-0 ${
            isMajor 
              ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]' 
              : 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
          }`}>
            {isMajor ? <ShieldAlert className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>

          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide mb-1 ${
              isMajor 
                ? 'bg-[#FFF1F2] text-[#E11D48]' 
                : 'bg-[#FEF3C7] text-[#92400E]'
            }`}>
              <Sparkles className="w-3 h-3" />
              <span>{isMajor ? 'Major Physical Mismatch' : 'Attribute Discrepancy'}</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#102018]">
              {consistency.warning_title || 'Possible Information Mismatch'}
            </h2>
            <p className="text-xs text-[#66756C] font-medium mt-1">
              FindIt AI verified your text against the uploaded photo.
            </p>
          </div>
        </div>

        {/* Comparison Details Box */}
        <div className="rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] p-4 space-y-3">
          <div className="text-xs text-[#2D3D34] leading-relaxed font-medium">
            {consistency.warning_message || (
              isMajor
                ? `Your description mentions a ${userText.claimed_object}, but the uploaded photograph appears to show a ${imageObs?.detected_object || 'different item'}.`
                : `Your description and image show minor attribute differences.`
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-[#E3ECE6]">
            {/* User Text Claim */}
            <div className="p-3 rounded-xl bg-white border border-[#E3ECE6] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A39B] block">
                Your Written Description
              </span>
              <div className="font-bold text-[#102018] capitalize">
                {userText.claimed_object || userText.claimed_category}
              </div>
              {userText.claimed_brand && (
                <div className="text-[11px] text-[#66756C]">Brand: <span className="font-semibold text-[#102018]">{userText.claimed_brand}</span></div>
              )}
              {userText.claimed_color && (
                <div className="text-[11px] text-[#66756C]">Color: <span className="font-semibold text-[#102018]">{userText.claimed_color}</span></div>
              )}
            </div>

            {/* AI Image Observation */}
            <div className="p-3 rounded-xl bg-white border border-[#D5ECD9] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#168A4A] block">
                AI Vision Detection
              </span>
              <div className="font-bold text-[#168A4A] capitalize">
                {imageObs?.detected_object || imageObs?.detected_category || 'Object in photo'}
              </div>
              {imageObs?.detected_brand && (
                <div className="text-[11px] text-[#66756C]">Brand: <span className="font-semibold text-[#102018]">{imageObs.detected_brand}</span></div>
              )}
              {imageObs?.detected_color && (
                <div className="text-[11px] text-[#66756C]">Color: <span className="font-semibold text-[#102018]">{imageObs.detected_color}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Guidance Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] text-[11px] text-[#168A4A] font-medium leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#35B86B]" />
          <span>
            {isMajor 
              ? 'Accurate reports help the campus community match lost items quickly. You can update your written details, replace the photo, or publish anyway if you are certain.'
              : 'You can quickly adjust the title or description, or proceed with your report.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onEditDetails}
            className="btn-primary py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 order-2 sm:order-1"
          >
            <Edit3 className="w-4 h-4" />
            <span>Review & Edit Details</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onContinueAnyway}
            className="py-3 px-4 rounded-2xl bg-white hover:bg-[#F7FBF8] text-[#66756C] hover:text-[#102018] border border-[#E3ECE6] text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-50"
          >
            <span>Continue Anyway</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
