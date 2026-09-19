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
  { label: 'Lost Wallet', query: 'I lost my leather wallet around the main block last night.' },
  { label: 'Uncertain Location', query: "I can't remember exactly where I lost my phone, but it was somewhere around the library or parking area." }
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
    <div className="rounded-3xl bg-white border border-brand-200 p-6 sm:p-8 card-3d space-y-6 shadow-[0_12px_32px_-4px_rgba(53,184,107,0.08)]">
      {/* Header with AI Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#EEF8F1] border border-brand-200 flex items-center justify-center text-brand-600 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#102018] tracking-tight">
              Intelligent Natural Language AI Search
            </h2>
            <p className="text-xs text-[#66756C]">
              Describe what you lost or found in your own words — our AI extracts features, locations & synonyms
            </p>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center bg-[#F7FBF8] p-1 rounded-xl border border-[#E3ECE6] text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedType === 'ALL' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('LOST')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedType === 'LOST' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            Lost
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('FOUND')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedType === 'FOUND' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            Found
          </button>
        </div>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you lost or found... (e.g. 'I lost my black Samsung phone near the college library yesterday. It has a transparent case and a small crack near the camera.')"
            className="w-full px-4 py-3.5 pr-28 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition-all resize-none shadow-inner"
          />

          {/* Right Action Controls in Textarea */}
          <div className="absolute right-3 bottom-4 flex items-center gap-2">
            {/* Optional Image Attach */}
            <label className="p-2 rounded-xl bg-white border border-[#E3ECE6] hover:border-brand-300 hover:bg-[#EEF8F1] text-[#66756C] hover:text-brand-700 cursor-pointer transition-colors shadow-sm" title="Attach item photo for visual AI comparison">
              <ImageIcon className="w-4 h-4" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>

            {/* AI Search Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Finding Matches...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Find Matches</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Image Attachment Preview */}
        {imagePreview && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EEF8F1] border border-brand-200 text-xs font-semibold text-brand-800">
            <img src={imagePreview} alt="Attached" className="w-6 h-6 rounded-md object-cover" />
            <span>Image Attached for Multimodal AI Analysis</span>
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="p-1 rounded-md hover:bg-brand-200/50 text-[#66756C] hover:text-rose-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Multi-Stage AI Search Loading Bar */}
        {isLoading && (
          <div className="p-4 rounded-2xl bg-[#EEF8F1] border border-brand-200 space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-brand-800">
              <span className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-brand-600 animate-spin" />
                {searchStep === 1 && 'Understanding your description...'}
                {searchStep === 2 && 'Finding relevant items...'}
                {searchStep >= 3 && 'Comparing potential matches...'}
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
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-[#66756C] uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3 h-3 text-brand-600" />
            <span>Try natural language examples:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePromptClick(ex.query)}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#F7FBF8] hover:bg-[#EEF8F1] border border-[#E3ECE6] hover:border-brand-300 text-[#102018] hover:text-brand-800 font-medium transition-all text-left shadow-sm cursor-pointer"
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
