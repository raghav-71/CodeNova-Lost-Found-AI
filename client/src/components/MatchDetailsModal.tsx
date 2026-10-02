import React from 'react';
import { PotentialMatch, Item } from '../types/index.js';
import { Sparkles, ShieldCheck, Check, X, MapPin, Calendar, Tag, ArrowRight, ArrowDownUp } from 'lucide-react';
import { API_BASE_URL } from '../services/api.js';

interface MatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: PotentialMatch | null;
  originItem?: Item | null;
  onClaimClick?: (matchItem: PotentialMatch) => void;
}

export function MatchDetailsModal({
  isOpen,
  onClose,
  match,
  originItem,
  onClaimClick
}: MatchDetailsModalProps) {
  if (!isOpen || !match) return null;

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL.replace('/api', '')}${cleanUrl}`;
  };

  const isMatchedItemFound = match.type === 'FOUND';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl border border-[#D5ECD9] shadow-[0_24px_48px_-12px_rgba(22,138,74,0.18)] overflow-hidden my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-details-title"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#F7FBF8] to-[#EEF8F1] border-b border-[#E3ECE6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#35B86B] to-[#64CC8B] p-0.5 shadow-md shadow-[#35B86B]/25 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex flex-col items-center justify-center text-center p-0.5">
                <span className="text-base font-black text-[#168A4A] leading-none">{match.match_score}%</span>
                <span className="text-[8px] font-extrabold text-[#66756C] uppercase tracking-tighter mt-0.5">Match</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 id="match-details-title" className="text-base font-extrabold text-[#102018]">
                  AI Potential Match Analysis
                </h3>
                <Sparkles className="w-4 h-4 text-[#35B86B]" />
              </div>
              <p className="text-xs text-[#66756C] font-medium">
                Automatic cross-user correlation discovered by FindIt AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E3ECE6] text-[#66756C] hover:text-[#102018] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Side-by-side or Stacked Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            {/* Origin Item Card */}
            <div className="rounded-2xl border border-[#E3ECE6] p-4 bg-[#F7FBF8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-white text-[#168A4A] border border-[#D5ECD9]">
                  {originItem?.type === 'FOUND' ? 'YOUR FOUND REPORT' : 'YOUR LOST REPORT'}
                </span>
              </div>
              <div className="flex gap-3 items-start">
                <img
                  src={getImageUrl(originItem?.primary_image)}
                  alt={originItem?.title || 'Your item'}
                  className="w-16 h-16 rounded-xl object-cover border border-[#E3ECE6] shrink-0 bg-[#EEF8F1]"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[#102018] line-clamp-1">{originItem?.title || 'Reported Item'}</h4>
                  <p className="text-xs text-[#66756C] line-clamp-2 mt-0.5">{originItem?.description}</p>
                </div>
              </div>
              <div className="text-[11px] text-[#66756C] space-y-1 pt-1 border-t border-[#E3ECE6]/60">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3 h-3 text-[#35B86B] shrink-0" />
                  <span>{originItem?.location}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3 h-3 text-[#94A39B] shrink-0" />
                  <span>{originItem?.date}</span>
                </div>
              </div>
            </div>

            {/* Middle Divider Icon on Mobile */}
            <div className="sm:hidden flex items-center justify-center -my-2 z-10">
              <div className="w-7 h-7 rounded-full bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A]">
                <ArrowDownUp className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Matched Candidate Item Card */}
            <div className="rounded-2xl border border-[#D5ECD9] p-4 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]">
                  {match.type === 'FOUND' ? 'POTENTIAL FOUND MATCH' : 'POTENTIAL LOST MATCH'}
                </span>
                <span className="text-[10px] font-bold text-[#66756C]">
                  {match.category}
                </span>
              </div>
              <div className="flex gap-3 items-start">
                <img
                  src={getImageUrl(match.primary_image)}
                  alt={match.title}
                  className="w-16 h-16 rounded-xl object-cover border border-[#E3ECE6] shrink-0 bg-[#EEF8F1]"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[#102018] line-clamp-1">{match.title}</h4>
                  <p className="text-xs text-[#66756C] line-clamp-2 mt-0.5">{match.description}</p>
                </div>
              </div>
              <div className="text-[11px] text-[#66756C] space-y-1 pt-1 border-t border-[#E3ECE6]/60">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3 h-3 text-[#35B86B] shrink-0" />
                  <span>{match.location}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3 h-3 text-[#94A39B] shrink-0" />
                  <span>{match.date}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Verified Signals Breakdown */}
          {match.matched_features && match.matched_features.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#102018] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#35B86B]" />
                <span>Verified Match Signals:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {match.matched_features.map((feat, i) => (
                  <span
                    key={i}
                    className="text-xs font-semibold bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-[#35B86B]" />
                    <span>{feat}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Reasoning Summary */}
          {match.match_reasons && match.match_reasons.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] space-y-2">
              <div className="text-xs font-bold text-[#102018]">
                Why AI suggests this potential match:
              </div>
              <ul className="space-y-1.5 text-xs text-[#2D3D34]">
                {match.match_reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#35B86B] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Safety Notice */}
          <div className="flex items-center gap-2.5 text-xs text-[#66756C] bg-[#EEF8F1]/70 p-3 rounded-2xl border border-[#D5ECD9]">
            <ShieldCheck className="w-4 h-4 text-[#35B86B] shrink-0" />
            <span className="font-medium">
              POTENTIAL MATCH: An AI match does not determine legal ownership. Ownership is established through the standard campus claim and handover workflow.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E3ECE6]">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E3ECE6] text-xs font-bold text-[#66756C] hover:text-[#102018] hover:bg-[#F7FBF8] transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {onClaimClick && isMatchedItemFound && (
                <button
                  onClick={() => {
                    onClose();
                    onClaimClick(match);
                  }}
                  className="btn-primary px-4 py-2.5 text-xs flex items-center gap-1.5"
                >
                  <span>Claim Item</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
