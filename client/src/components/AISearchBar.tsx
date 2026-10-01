import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Image as ImageIcon, 
  X, 
  ArrowRight, 
  Loader2, 
  BrainCircuit, 
  CheckCircle2 
} from 'lucide-react';

interface AISearchBarProps {
  onSearch: (query: string, type: string, imageBase64?: string) => void;
  isLoading: boolean;
  searchStep: number; // 1: Understanding, 2: Searching, 3: Analyzing
  initialQuery?: string;
}

const EXAMPLE_PROMPTS = [
  { label: 'Lost Samsung Phone', query: 'I lost my black Samsung phone near the library yesterday with a transparent case.' },
  { label: 'Lost Student ID', query: 'I lost my student ID card yesterday near the science building.' },
  { label: 'Found Blue Backpack', query: 'Someone found a blue backpack near the canteen with textbooks inside.' },
  { label: 'Lost Leather Wallet', query: 'I lost my brown leather wallet around the main block last night.' },
  { label: 'Uncertain Location', query: "I can't remember exactly where I lost my keys, but it was somewhere around the library or parking area." }
];

export function AISearchBar({ onSearch, isLoading, searchStep, initialQuery = '' }: AISearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), selectedType, imagePreview || undefined);
  };

  const handlePromptClick = (promptQuery: string) => {
    setQuery(promptQuery);
    onSearch(promptQuery, selectedType, imagePreview || undefined);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-3xl bg-white border border-brand-200 p-4 sm:p-7 card-3d space-y-5 shadow-[0_12px_32px_-4px_rgba(53,184,107,0.08)]">
      {/* Header with AI Badge & Type Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#EEF8F1] border border-brand-200 flex items-center justify-center text-brand-600 shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 text-[#35B86B]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#102018] tracking-tight">
              Intelligent Natural Language AI Search
            </h2>
            <p className="text-xs text-[#66756C] line-clamp-1 sm:line-clamp-none">
              Describe what you lost or found in your own words — our AI extracts features, locations & synonyms
            </p>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center bg-[#F7FBF8] p-1 rounded-xl border border-[#E3ECE6] text-xs font-bold shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors touch-target ${
              selectedType === 'ALL' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('LOST')}
            className={`px-3 py-1.5 rounded-lg transition-colors touch-target ${
              selectedType === 'LOST' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            Lost
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('FOUND')}
            className={`px-3 py-1.5 rounded-lg transition-colors touch-target ${
              selectedType === 'FOUND' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            Found
          </button>
        </div>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleFormSubmit} className="space-y-3.5">
        <div className="space-y-2">
          {/* Textarea with full typing space */}
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you lost or found in natural sentences... (e.g. 'I lost my black Samsung phone near the library yesterday with a transparent case and small scratch near the camera.')"
            className="w-full px-4 py-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition-all resize-none shadow-inner"
          />

          {/* Action Bar Beneath Textarea (Mobile-first responsive row) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Optional Photo Attachment */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E3ECE6] hover:border-brand-300 hover:bg-[#EEF8F1] text-[#66756C] hover:text-brand-700 cursor-pointer transition-colors shadow-sm text-xs font-semibold touch-target">
                <ImageIcon className="w-4 h-4 text-[#35B86B]" />
                <span>{imagePreview ? 'Photo Attached' : 'Attach Photo (Optional)'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>

              {imagePreview && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EEF8F1] border border-brand-200 text-xs font-semibold text-brand-800">
                  <img src={imagePreview} alt="Preview" className="w-5 h-5 rounded object-cover" />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="p-1 rounded text-[#66756C] hover:text-rose-600"
                    aria-label="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* AI Search Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold disabled:opacity-50 touch-target"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning Records...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Find Potential Matches</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Multi-Stage AI Search Loading Bar */}
        {isLoading && (
          <div className="p-4 rounded-2xl bg-[#EEF8F1] border border-brand-200 space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-brand-800">
              <span className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-brand-600 animate-spin" />
                {searchStep === 1 && 'Understanding your natural language description...'}
                {searchStep === 2 && 'Retrieving relevant campus item records...'}
                {searchStep >= 3 && 'Evaluating multimodal similarity metrics...'}
              </span>
              <span className="text-brand-600">{searchStep === 1 ? '33%' : searchStep === 2 ? '66%' : '90%'}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-brand-200 overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: searchStep === 1 ? '33%' : searchStep === 2 ? '66%' : '90%' }}
              />
            </div>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="space-y-2 pt-2 border-t border-[#E3ECE6]/80">
          <div className="text-[10px] sm:text-[11px] font-bold text-[#66756C] uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3 h-3 text-brand-600" />
            <span>Try natural language examples:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {EXAMPLE_PROMPTS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePromptClick(ex.query)}
                className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#F7FBF8] hover:bg-[#EEF8F1] border border-[#E3ECE6] hover:border-brand-300 text-[#102018] hover:text-brand-800 font-medium transition-all text-left shadow-sm active:scale-98"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
