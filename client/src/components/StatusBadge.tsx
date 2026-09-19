import React from 'react';
import { ItemStatus, ItemType } from '../types/index.js';
import { Sparkles, Clock, CheckCircle2, Archive } from 'lucide-react';

interface StatusBadgeProps {
  status: ItemStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-bold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-extrabold'
  };

  switch (status) {
    case 'RESOLVED':
      return (
        <span className={`inline-flex items-center rounded-full bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] shadow-sm ${sizeClasses[size]}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-[#35B86B]" />
          <span>Resolved & Recovered</span>
        </span>
      );
    case 'MATCH_FOUND':
      return (
        <span className={`inline-flex items-center rounded-full bg-[#E6F7EC] text-[#116B3A] border border-[#35B86B]/40 shadow-sm ${sizeClasses[size]}`}>
          <Sparkles className="w-3.5 h-3.5 text-[#35B86B]" />
          <span>Potential Match</span>
        </span>
      );
    case 'CLAIM_PENDING':
      return (
        <span className={`inline-flex items-center rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shadow-sm ${sizeClasses[size]}`}>
          <Clock className="w-3.5 h-3.5 text-[#D97706]" />
          <span>Claim Pending</span>
        </span>
      );
    case 'CLOSED':
      return (
        <span className={`inline-flex items-center rounded-full bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] ${sizeClasses[size]}`}>
          <Archive className="w-3.5 h-3.5" />
          <span>Closed</span>
        </span>
      );
    case 'ACTIVE':
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-[#F4FAF6] text-[#168A4A] border border-[#D5ECD9] ${sizeClasses[size]}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#35B86B]"></span>
          <span>Active Listing</span>
        </span>
      );
  }
}

export function TypeBadge({ type, size = 'md' }: { type: ItemType; size?: 'sm' | 'md' }) {
  const isLost = type === 'LOST';
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-lg font-extrabold tracking-wide uppercase shadow-sm ${sizeClasses} ${
        isLost
          ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]'
          : 'bg-[#EEF8F1] text-[#168A4A] border border-[#C7EED4]'
      }`}
    >
      {type}
    </span>
  );
}
