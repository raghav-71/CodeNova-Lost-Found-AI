import React, { useState } from 'react';
import { Search, RotateCcw, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { ItemCategory } from '../types/index.js';

interface ItemFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onTypeChange: (t: string) => void;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  selectedLocation: string;
  onLocationChange: (l: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  onReset: () => void;
}

const CATEGORIES: ItemCategory[] = [
  'Electronics',
  'Documents',
  'Wallet',
  'Keys',
  'Books',
  'Bags',
  'Clothing',
  'Accessories',
  'ID Cards',
  'Other'
];

const LOCATIONS = [
  'All Campus Locations',
  'Main University Library',
  'Student Center',
  'Science Building',
  'Engineering Building',
  'Sports Complex',
  'Campus Recreation Center',
  'Dining Hall / Cafeteria',
  'Parking Lot A/B'
];

export function ItemFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  selectedLocation,
  onLocationChange,
  selectedStatus,
  onStatusChange,
  selectedSort,
  onSortChange,
  onReset
}: ItemFiltersProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const hasActiveFilters =
    searchQuery ||
    selectedType !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedLocation !== 'All Campus Locations' ||
    selectedStatus !== 'ALL';

  return (
    <div className="space-y-4 rounded-3xl bg-white border border-[#E3ECE6] p-4 sm:p-6 shadow-[0_10px_28px_-4px_rgba(22,138,74,0.06),0_4px_10px_-2px_rgba(16,32,24,0.02)]">
      {/* Top Row: Search and Type Pills */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center justify-between">
        {/* Large Clean Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A39B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search catalog... (e.g. MacBook, Blue Backpack, Wallet, ID Card)"
            className="w-full pl-11 pr-14 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#94A39B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#35B86B] focus:ring-2 focus:ring-[#35B86B]/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#66756C] hover:text-[#102018]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Type Toggle Pills */}
        <div className="flex items-center justify-between sm:justify-start gap-1 p-1 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] shrink-0">
          <button
            onClick={() => onTypeChange('ALL')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target text-center ${
              selectedType === 'ALL'
                ? 'bg-white text-[#102018] shadow-sm border border-[#E3ECE6]'
                : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onTypeChange('LOST')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target text-center ${
              selectedType === 'LOST'
                ? 'bg-[#FFF1F2] text-[#E11D48] shadow-sm border border-[#FFE4E6]'
                : 'text-[#66756C] hover:text-[#E11D48]'
            }`}
          >
            Lost
          </button>
          <button
            onClick={() => onTypeChange('FOUND')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target text-center ${
              selectedType === 'FOUND'
                ? 'bg-[#EEF8F1] text-[#168A4A] shadow-sm border border-[#D5ECD9]'
                : 'text-[#66756C] hover:text-[#168A4A]'
            }`}
          >
            Found
          </button>
        </div>
      </div>

      {/* Category Filter Chips (Smooth touch scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs">
        <button
          onClick={() => onCategoryChange('ALL')}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl font-bold transition-all touch-target flex items-center ${
            selectedCategory === 'ALL'
              ? 'bg-[#35B86B] text-white shadow-sm shadow-[#35B86B]/30'
              : 'bg-[#F7FBF8] text-[#66756C] hover:text-[#102018] border border-[#E3ECE6]'
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl font-bold transition-all touch-target flex items-center ${
              selectedCategory === cat
                ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#35B86B] shadow-sm'
                : 'bg-[#F7FBF8] text-[#66756C] hover:text-[#102018] border border-[#E3ECE6]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Mobile Toggle for Advanced Filters */}
      <div className="sm:hidden pt-1">
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-xs font-bold text-[#102018]"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#35B86B]" />
            <span>More Filters (Location, Status, Sort)</span>
          </span>
          {mobileExpanded ? <ChevronUp className="w-4 h-4 text-[#66756C]" /> : <ChevronDown className="w-4 h-4 text-[#66756C]" />}
        </button>
      </div>

      {/* Bottom Dropdowns Row (Always visible on sm+, collapsible on mobile) */}
      <div className={`${mobileExpanded ? 'grid' : 'hidden sm:grid'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#E3ECE6] text-xs`}>
        {/* Campus Location */}
        <div>
          <label className="block text-[11px] font-bold text-[#66756C] mb-1">Campus Location</label>
          <select
            value={selectedLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] font-medium focus:outline-none focus:border-[#35B86B] touch-target"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc === 'All Campus Locations' ? 'ALL' : loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[11px] font-bold text-[#66756C] mb-1">Item Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] font-medium focus:outline-none focus:border-[#35B86B] touch-target"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Search</option>
            <option value="MATCH_FOUND">Potential Match Found</option>
            <option value="CLAIM_PENDING">Claim Pending</option>
            <option value="RESOLVED">Resolved / Recovered</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-[11px] font-bold text-[#66756C] mb-1">Sort Order</label>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] font-medium focus:outline-none focus:border-[#35B86B] touch-target"
          >
            <option value="newest">Newest Reports First</option>
            <option value="oldest">Oldest Reports First</option>
            <option value="date_desc">Incident Date (Recent First)</option>
          </select>
        </div>

        {/* Reset Action */}
        <div className="flex items-end">
          <button
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold transition-all touch-target ${
              hasActiveFilters
                ? 'bg-[#EEF8F1] border-[#D5ECD9] text-[#168A4A] hover:bg-[#E6F7EC] cursor-pointer'
                : 'bg-[#F7FBF8] border-[#E3ECE6] text-[#94A39B] opacity-60 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#35B86B]" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
}
