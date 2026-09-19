import React from 'react';
import { Link } from 'react-router-dom';
import { Item } from '../types/index.js';
import { StatusBadge, TypeBadge } from './StatusBadge.js';
import { MapPin, Calendar, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../services/api.js';

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const getImageUrl = (url?: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL.replace('/api', '')}${cleanUrl}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const hasHighMatch = item.top_match_score && item.top_match_score >= 70;

  return (
    <div className="group relative rounded-2xl bg-white border border-[#E3ECE6] hover:border-[#C7EED4] transition-all duration-300 flex flex-col overflow-hidden shadow-[0_10px_28px_-4px_rgba(22,138,74,0.07),0_4px_10px_-2px_rgba(16,32,24,0.03)] hover:shadow-[0_20px_38px_-8px_rgba(22,138,74,0.13),0_8px_16px_-4px_rgba(16,32,24,0.05)] hover:-translate-y-1.5">
      {/* Top Image Box */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EEF8F1]">
        <img
          src={getImageUrl(item.primary_image)}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80';
          }}
        />
        
        {/* Soft Subtle Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <TypeBadge type={item.type} size="sm" />
          <span className="text-[10px] font-bold bg-white/90 backdrop-blur-md text-[#102018] px-2.5 py-0.5 rounded-md border border-white/60 shadow-sm flex items-center gap-1">
            <Tag className="w-3 h-3 text-[#35B86B]" />
            {item.category}
          </span>
        </div>

        {/* AI Potential Match Badge */}
        {hasHighMatch && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#168A4A] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md shadow-[#168A4A]/25 backdrop-blur-md border border-[#35B86B]/40">
            <Sparkles className="w-3 h-3 text-[#C7EED4]" />
            <span>{item.top_match_score}% Potential Match</span>
          </div>
        )}

        {/* Status Badge in Bottom Right of Image */}
        <div className="absolute bottom-2.5 right-3">
          <StatusBadge status={item.status} size="sm" />
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-[#102018] group-hover:text-[#168A4A] transition-colors line-clamp-1 mb-1.5">
            {item.title}
          </h3>
          <p className="text-xs text-[#66756C] line-clamp-2 leading-relaxed mb-4">
            {item.description}
          </p>
        </div>

        <div className="space-y-3 pt-3 border-t border-[#E3ECE6]">
          {/* Location & Date */}
          <div className="flex items-center justify-between text-xs text-[#66756C]">
            <div className="flex items-center gap-1.5 max-w-[55%] truncate" title={item.location}>
              <MapPin className="w-3.5 h-3.5 text-[#35B86B] shrink-0" />
              <span className="truncate font-medium">{item.location}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#94A39B]" />
              <span>{formatDate(item.date)}</span>
            </div>
          </div>

          {/* Action Button */}
          <Link
            to={`/items/${item.id}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#F7FBF8] hover:bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] hover:border-[#35B86B] transition-all duration-200 group/btn"
          >
            <span>View Full Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform text-[#35B86B]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
