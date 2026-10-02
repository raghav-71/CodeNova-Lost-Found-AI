import React from 'react';
import { Link } from 'react-router-dom';
import { PotentialMatch } from '../types/index.js';
import { Sparkles, ShieldCheck, ArrowUpRight, Tag, MapPin, Calendar, Check } from 'lucide-react';
import { API_BASE_URL } from '../services/api.js';

interface AIMatchCardProps {
  match: PotentialMatch;
  originItemId: string;
  onClaimClick?: (matchItem: PotentialMatch) => void;
  onViewDetails?: (matchItem: PotentialMatch) => void;
}

export function AIMatchCard({ match, originItemId, onClaimClick, onViewDetails }: AIMatchCardProps) {
  const getImageUrl = (url?: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL.replace('/api', '')}${cleanUrl}`;
  };

  return (
    <div className="rounded-3xl bg-white border border-[#D5ECD9] p-6 shadow-[0_12px_32px_-4px_rgba(22,138,74,0.1),0_4px_12px_-2px_rgba(16,32,24,0.03)] relative overflow-hidden group hover:border-[#35B86B] transition-all duration-300">
      {/* Header: Score and AI Tag */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E3ECE6]">
        <div className="flex items-center gap-3">
          {/* 3D Circular Match Score Badge */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#35B86B] to-[#64CC8B] p-0.5 shadow-md shadow-[#35B86B]/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white rounded-[14px] flex flex-col items-center justify-center text-center p-1">
              <span className="text-sm font-black text-[#168A4A] leading-none">{match.match_score}%</span>
              <span className="text-[8px] font-extrabold text-[#66756C] uppercase tracking-tighter mt-0.5">Match</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#168A4A] uppercase tracking-wide">
                AI Potential Match
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#35B86B]" />
            </div>
            <div className="text-[11px] font-medium text-[#66756C]">
              {match.ai_evaluated ? 'Evaluated via Gemini Semantic Engine' : 'Evaluated via Campus Proximity Engine'}
            </div>
          </div>
        </div>

        <span className="text-[10px] font-extrabold bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] px-2.5 py-1 rounded-lg">
          {match.type === 'FOUND' ? 'Found Item Report' : 'Lost Item Report'}
        </span>
      </div>

      {/* Matched Item Summary */}
      <div className="py-4 flex flex-col sm:flex-row gap-4 items-start">
        <img
          src={getImageUrl(match.primary_image)}
          alt={match.title}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#E3ECE6] shrink-0 bg-[#EEF8F1]"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[#102018] group-hover:text-[#168A4A] transition-colors line-clamp-1 mb-1">
            {match.title}
          </h4>
          <p className="text-xs text-[#66756C] line-clamp-2 leading-relaxed mb-2.5">
            {match.description}
          </p>

          <div className="flex flex-wrap gap-2 text-[11px] text-[#66756C] font-medium">
            <span className="flex items-center gap-1 bg-[#F7FBF8] px-2.5 py-1 rounded-lg border border-[#E3ECE6]">
              <MapPin className="w-3 h-3 text-[#35B86B]" />
              {match.location}
            </span>
            <span className="flex items-center gap-1 bg-[#F7FBF8] px-2.5 py-1 rounded-lg border border-[#E3ECE6]">
              <Calendar className="w-3 h-3 text-[#94A39B]" />
              {match.date}
            </span>
          </div>
        </div>
      </div>

      {/* Matched Feature Chips */}
      {match.matched_features && match.matched_features.length > 0 && (
        <div className="py-1 flex flex-wrap gap-1.5">
          {match.matched_features.map((feat, i) => (
            <span
              key={i}
              className="text-[10px] font-bold bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] px-2.5 py-0.5 rounded-md flex items-center gap-1"
            >
              <Tag className="w-2.5 h-2.5 text-[#35B86B]" />
              {feat}
            </span>
          ))}
        </div>
      )}

      {/* AI Reasons Breakdown Box */}
      {match.match_reasons && match.match_reasons.length > 0 && (
        <div className="mt-3 p-3.5 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] space-y-1.5 text-xs">
          <div className="text-[11px] font-bold text-[#102018] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#35B86B]" />
            <span>Why AI suggests this potential match:</span>
          </div>
          <ul className="space-y-1 text-[#2D3D34] text-[11px]">
            {match.match_reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5 text-[#35B86B] shrink-0 mt-0.5" />
                <span className="leading-snug">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Safety Disclaimer Notice */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-[#66756C] bg-[#EEF8F1]/60 p-2.5 rounded-xl border border-[#D5ECD9]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#35B86B] shrink-0" />
        <span className="font-medium">POTENTIAL MATCH: AI evaluates similarities only. Ownership must be verified by humans.</span>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-[#E3ECE6] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(match)}
              className="text-xs font-bold text-[#168A4A] hover:text-[#116B3A] flex items-center gap-1 transition-colors"
            >
              <span>View Match</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          <Link
            to={`/items/${match.id}`}
            className="text-xs font-medium text-[#66756C] hover:text-[#102018] flex items-center gap-1 transition-colors"
          >
            <span>Inspect Item</span>
          </Link>
        </div>

        {onClaimClick && match.type === 'FOUND' && (
          <button
            onClick={() => onClaimClick(match)}
            className="btn-primary px-3.5 py-1.5 text-xs shadow-sm shadow-[#35B86B]/20"
          >
            Claim Item
          </button>
        )}
      </div>
    </div>
  );
}
