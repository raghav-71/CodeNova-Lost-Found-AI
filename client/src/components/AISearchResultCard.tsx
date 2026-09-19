import React from 'react';
import { Link } from 'react-router-dom';
import { AIMatchSearchResult } from '../types/index.js';
import { StatusBadge, TypeBadge } from './StatusBadge.js';
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck,
  Tag
} from 'lucide-react';

interface AISearchResultCardProps {
  result: AIMatchSearchResult;
  rankIndex: number;
}

export function AISearchResultCard({ result, rankIndex }: AISearchResultCardProps) {
  const { item, match_score, match_tier, reason, matching_attributes, differences } = result;

  const getTierStyles = () => {
    switch (match_tier) {
      case 'STRONG_MATCH':
        return {
          badgeBg: 'bg-[#E6F7EC] text-brand-700 border-brand-300',
          border: 'border-brand-300 ring-2 ring-brand-500/10',
          label: 'Strong Potential Match',
          scoreColor: 'text-brand-600',
          ringColor: '#35B86B'
        };
      case 'POTENTIAL_MATCH':
        return {
          badgeBg: 'bg-[#EEF8F1] text-brand-700 border-brand-200',
          border: 'border-[#E3ECE6]',
          label: 'Potential Match',
          scoreColor: 'text-brand-600',
          ringColor: '#35B86B'
        };
      default:
        return {
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          border: 'border-[#E3ECE6]',
          label: 'Possible Match',
          scoreColor: 'text-amber-600',
          ringColor: '#F59E0B'
        };
    }
  };

  const tier = getTierStyles();

  return (
    <div className={`rounded-3xl bg-white border ${tier.border} p-5 sm:p-6 card-3d space-y-5 transition-all hover:translate-y-[-2px]`}>
      {/* Top Banner: Rank + Potential Match Tier + Match Percentage */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E3ECE6]">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#EEF8F1] text-brand-700 text-xs font-extrabold flex items-center justify-center">
            #{rankIndex + 1}
          </span>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${tier.badgeBg}`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{tier.label}</span>
          </div>
          <TypeBadge type={item.type} />
        </div>

        {/* Circular Match Score Ring */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-lg sm:text-xl font-extrabold ${tier.scoreColor} tracking-tight`}>
              {match_score}%
            </div>
            <div className="text-[10px] text-[#66756C] font-semibold uppercase tracking-wider">
              Similarity Score
            </div>
          </div>
          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                strokeWidth="3.5"
                strokeDasharray={`${match_score}, 100`}
                stroke={tier.ringColor}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <Sparkles className={`absolute w-4 h-4 ${tier.scoreColor}`} />
          </div>
        </div>
      </div>

      {/* Item Body: Image + Information */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Item Image Thumbnail */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#F7FBF8] border border-[#E3ECE6] shadow-sm group">
            <img
              src={item.primary_image || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80'}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute top-2.5 left-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[11px] font-bold text-[#102018] shadow-sm flex items-center gap-1">
                <Tag className="w-3 h-3 text-brand-600" />
                {item.category}
              </span>
            </div>
          </div>
        </div>

        {/* Item Metadata & AI Reasoning */}
        <div className="md:col-span-8 lg:col-span-9 space-y-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#102018] tracking-tight hover:text-brand-600 transition-colors">
              <Link to={`/items/${item.id}`}>{item.title}</Link>
            </h3>
            <p className="text-xs text-[#66756C] mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Location & Date Pills */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#66756C] font-medium">
            <span className="inline-flex items-center gap-1 bg-[#F7FBF8] px-2.5 py-1 rounded-lg border border-[#E3ECE6]">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>{item.location} {item.building_zone ? `(${item.building_zone})` : ''}</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-[#F7FBF8] px-2.5 py-1 rounded-lg border border-[#E3ECE6]">
              <Calendar className="w-3.5 h-3.5 text-[#66756C]" />
              <span>{item.date}</span>
            </span>
          </div>

          {/* AI Explanation Paragraph */}
          <div className="p-3.5 rounded-2xl bg-[#EEF8F1]/70 border border-brand-200 space-y-2">
            <div className="text-xs font-bold text-brand-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Why this may match:</span>
            </div>
            <p className="text-xs text-[#102018] leading-relaxed">
              {reason}
            </p>

            {/* Why It Matches Checklist */}
            {matching_attributes.length > 0 && (
              <div className="pt-2 border-t border-brand-200/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {matching_attributes.map((attr, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] text-brand-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                    <span>{attr}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Differences Noted (if any) */}
            {differences.length > 0 && (
              <div className="pt-1.5 border-t border-brand-200/60 space-y-1">
                {differences.map((diff, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{diff}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Footer: Safety Notice + Action CTA */}
      <div className="pt-4 border-t border-[#E3ECE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[#66756C]">
          <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
          <span>Potential Match only. Ownership is verified through human claim review.</span>
        </div>

        <Link
          to={`/items/${item.id}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold btn-primary shrink-0"
        >
          <span>View Listing & Claim</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
