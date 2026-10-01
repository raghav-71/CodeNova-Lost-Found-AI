import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Item, AIMatchSearchResult, ExtractedIntent } from '../types/index.js';
import { ItemCard } from '../components/ItemCard.js';
import { ItemFilters } from '../components/ItemFilters.js';
import { AISearchBar } from '../components/AISearchBar.js';
import { AISearchResultCard } from '../components/AISearchResultCard.js';
import { CardSkeleton } from '../components/SkeletonLoader.js';
import { 
  LayoutGrid, 
  List, 
  Layers, 
  PlusCircle, 
  Sparkles, 
  SlidersHorizontal,
  Tag,
  MapPin,
  Calendar,
  Search,
  CheckCircle2
} from 'lucide-react';

export function BrowseItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'ai' || Boolean(searchParams.get('q')) ? 'ai' : 'ai';
  const initialQuery = searchParams.get('q') || '';

  // Mode: 'ai' (Natural Language) vs 'filters' (Traditional Catalog)
  const [searchMode, setSearchMode] = useState<'ai' | 'filters'>(initialMode);

  // Catalog items & states
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // AI Search states
  const [aiResults, setAiResults] = useState<AIMatchSearchResult[]>([]);
  const [aiIntent, setAiIntent] = useState<ExtractedIntent | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSearchStep, setAiSearchStep] = useState(1);
  const [hasSearchedAi, setHasSearchedAi] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('All Campus Locations');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Debounce traditional search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load standard items for directory
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getItems({
        q: debouncedQuery,
        type: selectedType,
        category: selectedCategory,
        location: selectedLocation === 'All Campus Locations' ? undefined : selectedLocation,
        status: selectedStatus,
        sort: selectedSort
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedType, selectedCategory, selectedLocation, selectedStatus, selectedSort]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Trigger AI Search
  const handleAiSearch = async (queryText: string, type: string, imageBase64?: string) => {
    setIsAiLoading(true);
    setHasSearchedAi(true);
    setAiSearchStep(1);

    // Multi-stage progress visualizer timer
    const stepTimer1 = setTimeout(() => setAiSearchStep(2), 500);
    const stepTimer2 = setTimeout(() => setAiSearchStep(3), 1100);

    try {
      const res = await api.aiSearch({
        query: queryText,
        type: type === 'ALL' ? undefined : type,
        imageBase64
      });

      setAiIntent(res.intent);
      setAiResults(res.results || []);
    } catch (err) {
      console.error('AI search failed:', err);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAiLoading(false);
    }
  };

  // Run initial query if present in URL
  useEffect(() => {
    if (initialQuery) {
      handleAiSearch(initialQuery, 'ALL');
    }
  }, []);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedType('ALL');
    setSelectedCategory('ALL');
    setSelectedLocation('All Campus Locations');
    setSelectedStatus('ALL');
    setSelectedSort('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
            Campus Lost & Found Discovery
          </h1>
          <p className="text-xs sm:text-sm text-[#66756C] mt-1 font-medium">
            Search naturally with AI semantic understanding or browse using traditional campus filters
          </p>
        </div>

        {/* Search Mode Switcher Tabs */}
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center bg-white p-1 rounded-2xl border border-[#E3ECE6] shadow-sm">
          <button
            onClick={() => setSearchMode('ai')}
            className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
              searchMode === 'ai'
                ? 'bg-[#35B86B] text-white shadow-sm'
                : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Natural Search</span>
          </button>
          <button
            onClick={() => setSearchMode('filters')}
            className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
              searchMode === 'filters'
                ? 'bg-[#35B86B] text-white shadow-sm'
                : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter Catalog</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: AI NATURAL LANGUAGE SEARCH
          ========================================================================= */}
      {searchMode === 'ai' && (
        <div className="space-y-6">
          {/* AI Search Prompt Component */}
          <AISearchBar
            onSearch={handleAiSearch}
            isLoading={isAiLoading}
            searchStep={aiSearchStep}
            initialQuery={initialQuery}
          />

          {/* AI Extracted Intent Summary Box */}
          {aiIntent && (
            <div className="rounded-3xl bg-white border border-[#E3ECE6] p-5 sm:p-6 card-3d space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#EEF8F1] flex items-center justify-center text-brand-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#102018]">
                    AI Understanding & Extracted Query Intent:
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-brand-700 bg-[#EEF8F1] px-2.5 py-0.5 rounded-full">
                  Confidence {(aiIntent.confidence ? Math.round(aiIntent.confidence * 100) : 95)}%
                </span>
              </div>

              {/* Extracted Entity Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {aiIntent.object && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-xs font-semibold text-[#102018]">
                    <span className="text-[#66756C]">Target:</span> {aiIntent.object}
                  </span>
                )}
                {aiIntent.category && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#EEF8F1] border border-brand-200 text-xs font-bold text-brand-700">
                    <Tag className="w-3 h-3 text-brand-600" />
                    <span>Category: {aiIntent.category}</span>
                  </span>
                )}
                {aiIntent.color && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-xs font-semibold text-[#102018]">
                    <span className="text-[#66756C]">Color:</span> {aiIntent.color}
                  </span>
                )}
                {aiIntent.location && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-xs font-semibold text-[#102018]">
                    <MapPin className="w-3 h-3 text-brand-600" />
                    <span>Location: {aiIntent.location}</span>
                  </span>
                )}
                {aiIntent.relative_date && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-xs font-semibold text-[#102018]">
                    <Calendar className="w-3 h-3 text-[#66756C]" />
                    <span>Date: {aiIntent.relative_date} {aiIntent.resolved_date ? `(${aiIntent.resolved_date})` : ''}</span>
                  </span>
                )}
                {aiIntent.keywords.map((kw, i) => (
                  <span key={i} className="text-[11px] font-medium text-[#66756C] bg-slate-100 px-2 py-0.5 rounded-lg">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Search Results Header */}
          {hasSearchedAi && (
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base sm:text-lg font-extrabold text-[#102018] flex items-center gap-2">
                <span>Ranked Potential Matches</span>
                <span className="text-xs font-bold text-brand-700 bg-[#EEF8F1] px-2.5 py-0.5 rounded-full">
                  {aiResults.length} {aiResults.length === 1 ? 'match' : 'matches'}
                </span>
              </h3>
            </div>
          )}

          {/* AI Search Results List */}
          {isAiLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : hasSearchedAi && aiResults.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E3ECE6] p-12 text-center space-y-4 card-3d">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF8F1] flex items-center justify-center mx-auto text-brand-600">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#102018]">No strong potential matches found</h3>
              <p className="text-xs text-[#66756C] max-w-md mx-auto leading-relaxed">
                Our AI scanned campus records but did not find high-confidence matches for this description. Try rephrasing or switch to the catalog filters to browse all items.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setSearchMode('filters')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F7FBF8] hover:bg-[#EEF8F1] text-brand-700 border border-brand-200 transition-colors"
                >
                  Browse Full Catalog
                </button>
                <Link
                  to="/report/lost"
                  className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Report Lost Item</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {aiResults.map((result, idx) => (
                <AISearchResultCard
                  key={result.item.id}
                  result={result}
                  rankIndex={idx}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: TRADITIONAL FILTER CATALOG
          ========================================================================= */}
      {searchMode === 'filters' && (
        <div className="space-y-6">
          {/* Advanced Filter Component */}
          <ItemFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            onReset={handleResetFilters}
          />

          {/* Results Count Meta + View Toggle */}
          <div className="flex items-center justify-between text-xs text-[#66756C] px-1 font-medium">
            <span>
              Showing <strong className="text-[#102018] font-bold">{items.length}</strong> of{' '}
              <strong className="text-[#102018] font-bold">{total}</strong> campus items
            </span>

            <div className="flex items-center bg-white p-1 rounded-xl border border-[#E3ECE6] shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === 'grid' ? 'bg-[#35B86B] text-white' : 'text-[#66756C] hover:text-[#102018]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === 'list' ? 'bg-[#35B86B] text-white' : 'text-[#66756C] hover:text-[#102018]'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Item List / Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E3ECE6] p-12 text-center space-y-4 card-3d">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF8F1] flex items-center justify-center mx-auto text-brand-600">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#102018]">No items found</h3>
              <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
                Hopefully you won't lose anything — but we're ready whenever you do. Try clearing your filters or create a report!
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F7FBF8] hover:bg-[#EEF8F1] text-brand-700 border border-brand-200 transition-colors"
                >
                  Clear All Filters
                </button>
                <Link
                  to="/report/lost"
                  className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Report Lost Item</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
