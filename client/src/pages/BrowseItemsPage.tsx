import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Item, AIMatchSearchResult, ExtractedIntent, MultilingualDetection } from '../types/index.js';
import { ItemCard } from '../components/ItemCard.js';
import { ItemFilters } from '../components/ItemFilters.js';
import { AISearchBar } from '../components/AISearchBar.js';
import { AISearchResultCard } from '../components/AISearchResultCard.js';
import { CardSkeleton } from '../components/SkeletonLoader.js';
import { 
  Sparkles, 
  Filter, 
  LayoutGrid, 
  List, 
  MapPin, 
  Tag, 
  Calendar, 
  AlertCircle,
  PlusCircle,
  Search,
  Bot,
  Languages,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

export function BrowseItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'ai' || Boolean(searchParams.get('q')) ? 'ai' : 'ai';
  const initialQuery = searchParams.get('q') || '';

  // Mode state: 'ai' (Conversational Multilingual Search) or 'filters' (Manual Grid)
  const [searchMode, setSearchMode] = useState<'ai' | 'filters'>(initialMode);

  // Conversational AI Search states
  const [sessionId, setSessionId] = useState<string>(() => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const [detectedLanguage, setDetectedLanguage] = useState<MultilingualDetection | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<any | null>(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [aiResults, setAiResults] = useState<AIMatchSearchResult[]>([]);
  const [aiIntent, setAiIntent] = useState<ExtractedIntent | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSearchStep, setAiSearchStep] = useState(1);
  const [hasSearchedAi, setHasSearchedAi] = useState(false);

  // Traditional Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('All Campus Locations');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSort, setSelectedSort] = useState('newest');

  // Directory Catalog Data states
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Debounce traditional search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Catalog Items
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getItems({
        q: debouncedQuery || undefined,
        type: selectedType === 'ALL' ? undefined : selectedType,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        location: selectedLocation === 'All Campus Locations' ? undefined : selectedLocation,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        sort: selectedSort,
        limit: 50
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedType, selectedCategory, selectedLocation, selectedStatus, selectedSort]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Trigger Multilingual Conversational AI Search
  const handleConversationalSearch = async (
    queryText: string,
    type: string,
    imageBase64?: string,
    isVoice?: boolean,
    preferredLanguage?: string
  ) => {
    setIsAiLoading(true);
    setHasSearchedAi(true);
    setAiSearchStep(1);

    const stepTimer1 = setTimeout(() => setAiSearchStep(2), 500);
    const stepTimer2 = setTimeout(() => setAiSearchStep(3), 1100);

    try {
      const res = await api.conversationalSearch({
        query: queryText,
        sessionId,
        type: type === 'ALL' ? undefined : type,
        preferredLanguage,
        imageBase64,
        isVoice
      });

      if (res.sessionId) setSessionId(res.sessionId);
      if (res.detectedLanguage) setDetectedLanguage(res.detectedLanguage);
      if (res.normalizedIntent) setAiIntent(res.normalizedIntent);
      if (res.activeFilters) setActiveFilters(res.activeFilters);
      if (res.message) setAiMessage(res.message);
      setAiResults(res.results || []);
      setFollowUpSuggestions(res.followUpSuggestions || []);
    } catch (err) {
      console.error('Conversational AI search failed:', err);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAiLoading(false);
    }
  };

  const handleClearConversationContext = async () => {
    try {
      await api.resetConversationSession(sessionId);
    } catch {}
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    setDetectedLanguage(null);
    setAiMessage(null);
    setActiveFilters(null);
    setAiIntent(null);
    setAiResults([]);
    setFollowUpSuggestions([]);
    setHasSearchedAi(false);
  };

  // Run initial query if present in URL
  useEffect(() => {
    if (initialQuery) {
      handleConversationalSearch(initialQuery, 'ALL');
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
            Search naturally with multilingual conversational AI or browse using traditional campus filters
          </p>
        </div>

        {/* Search Mode Switcher Tabs */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-[#E3ECE6] shadow-sm self-start sm:self-auto shrink-0">
          <button
            onClick={() => setSearchMode('ai')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
              searchMode === 'ai'
                ? 'bg-[#35B86B] text-white shadow-sm'
                : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Natural Search</span>
          </button>
          <button
            onClick={() => setSearchMode('filters')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
              searchMode === 'filters'
                ? 'bg-[#35B86B] text-white shadow-sm'
                : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Campus Catalog</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: MULTILINGUAL CONVERSATIONAL AI SEARCH
          ========================================================================= */}
      {searchMode === 'ai' && (
        <div className="space-y-5">
          {/* AI Search & Voice Bar */}
          <AISearchBar
            onSearch={handleConversationalSearch}
            isLoading={isAiLoading}
            searchStep={aiSearchStep}
            initialQuery={initialQuery}
            detectedLanguage={detectedLanguage}
            activeFilters={activeFilters}
            onClearContext={handleClearConversationContext}
          />

          {/* AI Conversational Response Message */}
          {aiMessage && (
            <div className="p-4 sm:p-5 rounded-3xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-start gap-3 shadow-sm animate-in fade-in">
              <div className="w-9 h-9 rounded-2xl bg-white border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] shadow-sm shrink-0 mt-0.5">
                <Bot className="w-5 h-5 text-[#35B86B]" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#168A4A] flex items-center gap-1.5">
                    <span>FindIt AI Response</span>
                    {detectedLanguage && (
                      <span className="text-[10px] font-semibold text-[#168A4A] bg-white px-2 py-0.5 rounded-full border border-[#D5ECD9]">
                        {detectedLanguage.language_name}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#102018] font-medium leading-relaxed">
                  {aiMessage}
                </p>
              </div>
            </div>
          )}

          {/* Context Filter Chips */}
          {activeFilters && (activeFilters.object || activeFilters.location || activeFilters.date || (activeFilters.color && activeFilters.color.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-[11px] font-bold text-[#66756C]">Active Context:</span>
              {activeFilters.object && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white border border-[#E3ECE6] text-[#102018]">
                  Item: <span className="text-[#168A4A] font-bold">{activeFilters.object}</span>
                </span>
              )}
              {activeFilters.color && activeFilters.color.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white border border-[#E3ECE6] text-[#102018]">
                  Color: <span className="text-[#168A4A] font-bold">{activeFilters.color.join(', ')}</span>
                </span>
              )}
              {activeFilters.location && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white border border-[#E3ECE6] text-[#102018]">
                  Location: <span className="text-[#168A4A] font-bold">{activeFilters.location}</span>
                </span>
              )}
              {activeFilters.date && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white border border-[#E3ECE6] text-[#102018]">
                  Date: <span className="text-[#168A4A] font-bold">{activeFilters.date}</span>
                </span>
              )}
            </div>
          )}

          {/* Quick Follow-up Suggestion Chips */}
          {followUpSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
              <span className="text-[11px] font-bold text-[#66756C]">Follow-up:</span>
              {followUpSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleConversationalSearch(sug, 'ALL')}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-[#EEF8F1] border border-[#E3ECE6] hover:border-[#35B86B] text-[#102018] hover:text-[#168A4A] transition-colors font-medium shadow-sm"
                >
                  + {sug}
                </button>
              ))}
            </div>
          )}

          {/* AI Search Results Header */}
          {hasSearchedAi && (
            <div className="flex items-center justify-between px-1 pt-2">
              <h3 className="text-base sm:text-lg font-extrabold text-[#102018] flex items-center gap-2">
                <span>Ranked Potential Matches</span>
                <span className="text-xs font-bold text-[#168A4A] bg-[#EEF8F1] px-2.5 py-0.5 rounded-full border border-[#D5ECD9]">
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
            <div className="rounded-3xl bg-white border border-[#E3ECE6] p-12 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#102018]">No strong potential matches found</h3>
              <p className="text-xs text-[#66756C] max-w-md mx-auto leading-relaxed font-medium">
                Our AI scanned campus records but did not find high-confidence matches for this description. Try rephrasing or switch to the catalog filters to browse all items.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setSearchMode('filters')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F7FBF8] hover:bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] transition-colors"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E3ECE6] p-12 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#102018]">No items found matching criteria</h3>
              <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
                Try widening your location or category filters, or switch to AI natural language search.
              </p>
              <button
                onClick={handleResetFilters}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}>
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
