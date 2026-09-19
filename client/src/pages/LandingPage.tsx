import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Item, CampusStats } from '../types/index.js';
import { ItemCard } from '../components/ItemCard.js';
import { 
  Sparkles, 
  Search, 
  PlusCircle, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  Layers, 
  Cpu, 
  MapPin, 
  Calendar 
} from 'lucide-react';

export function LandingPage() {
  const [stats, setStats] = useState<CampusStats>({
    itemsLost: 14,
    itemsFound: 18,
    totalItems: 32,
    resolvedItems: 24,
    activeClaims: 5,
    potentialMatches: 12,
    recoveryRate: 88
  });
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        const statsRes = await api.getCampusStats();
        if (statsRes.stats) setStats(statsRes.stats);
        
        const itemsRes = await api.getItems({ limit: 6 });
        if (itemsRes.items) setRecentItems(itemsRes.items);
      } catch (e) {
        console.warn('Failed to load landing page data:', e);
      }
    }
    loadData();
  }, []);

  const filteredItems = recentItems.filter(item => {
    if (activeTab === 'ALL') return true;
    return item.type === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#F7FBF8] text-[#102018] overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline & CTAs */}
          <div className="lg:col-span-6 space-y-6">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF8F1] border border-[#D5ECD9] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#35B86B]"></span>
              <span className="text-xs font-extrabold text-[#168A4A] tracking-wide uppercase">
                AI POWERED CAMPUS LOST & FOUND
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#102018] leading-[1.15]">
              Lost something? <br />
              <span className="text-[#35B86B]">Let's find it.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-[#66756C] leading-relaxed font-medium">
              Describe what you lost or found. FindIt AI understands your description and helps you discover potential matches.
            </p>

            {/* Natural Language Hero Search Input */}
            <div className="pt-2">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const inputEl = (e.currentTarget.elements.namedItem('heroQuery') as HTMLInputElement);
                  if (inputEl && inputEl.value.trim()) {
                    window.location.href = `/items?q=${encodeURIComponent(inputEl.value.trim())}&mode=ai`;
                  }
                }}
                className="relative flex items-center"
              >
                <div className="absolute left-4 text-brand-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="heroQuery"
                  placeholder="Describe what you lost or found... (e.g. 'black Samsung phone near library')"
                  className="w-full pl-12 pr-32 py-3.5 rounded-2xl bg-white border border-[#E3ECE6] text-[#102018] placeholder-[#66756C]/60 text-xs sm:text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 shadow-md shadow-brand-500/5 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-4 py-2 rounded-xl text-xs font-bold btn-primary flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Find Matches</span>
                </button>
              </form>
            </div>

            {/* CTAs */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Link
                to="/report/lost"
                className="btn-primary px-7 py-3.5 text-sm flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Lost Item</span>
              </Link>

              <Link
                to="/items"
                className="btn-secondary px-7 py-3.5 text-sm flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4 text-[#35B86B]" />
                <span>Find an Item</span>
              </Link>
            </div>

            {/* Micro Trust Strip */}
            <div className="pt-4 flex items-center gap-6 text-xs text-[#66756C] font-semibold">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#35B86B]" /> 100% Free for Students
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#35B86B]" /> Privacy Protected
              </span>
            </div>
          </div>

          {/* Right Column: Premium 3D Visual Composition */}
          <div className="lg:col-span-6 relative perspective-container">
            {/* Background 3D Soft Light */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#35B86B]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-0"></div>

            <div className="relative z-10 space-y-4 max-w-md mx-auto">
              {/* Floating Lost Item Card (Top) */}
              <div className="p-4 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_16px_36px_-6px_rgba(22,138,74,0.12),0_4px_12px_-2px_rgba(16,32,24,0.04)] flex items-center gap-3.5 card-perspective-left">
                <img
                  src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80"
                  alt="Lost Item"
                  className="w-14 h-14 rounded-xl object-cover border border-[#E3ECE6] bg-[#EEF8F1] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold bg-[#FFF1F2] text-[#E11D48] px-2 py-0.5 rounded">
                      LOST REPORT
                    </span>
                    <span className="text-[11px] text-[#94A39B]">Main Library 3rd Fl.</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#102018] truncate mt-1">
                    Space Black MacBook Pro 14" (M3)
                  </h4>
                  <p className="text-[11px] text-[#66756C] truncate">Has Octocat sticker on lid</p>
                </div>
              </div>

              {/* 3D AI Analysis Connector Card (Middle) */}
              <div className="p-3.5 rounded-2xl bg-[#EEF8F1] border border-[#C7EED4] shadow-md flex items-center justify-between mx-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#35B86B] text-white flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-[#168A4A] uppercase tracking-wider">
                      ✦ AI SEMANTIC ANALYSIS ✦
                    </div>
                    <div className="text-xs font-bold text-[#102018]">94% Potential Similarity Detected</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#168A4A] bg-white px-2.5 py-1 rounded-lg border border-[#D5ECD9]">
                  Match
                </span>
              </div>

              {/* Floating Found Item Card (Bottom) */}
              <div className="p-4 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_16px_36px_-6px_rgba(22,138,74,0.12),0_4px_12px_-2px_rgba(16,32,24,0.04)] flex items-center gap-3.5 card-perspective-right">
                <img
                  src="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&auto=format&fit=crop&q=80"
                  alt="Found Item"
                  className="w-14 h-14 rounded-xl object-cover border border-[#E3ECE6] bg-[#EEF8F1] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold bg-[#EEF8F1] text-[#168A4A] px-2 py-0.5 rounded">
                      FOUND REPORT
                    </span>
                    <span className="text-[11px] text-[#94A39B]">Main Library 3rd Fl.</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#102018] truncate mt-1">
                    Dark Grey Apple Laptop
                  </h4>
                  <p className="text-[11px] text-[#66756C] truncate">Kept at Library Help Desk</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Elevated Campus Statistics Strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] text-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#102018]">{stats.totalItems}+</span>
            <span className="block text-xs font-semibold text-[#66756C] mt-1">Total Campus Reports</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#D5ECD9] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.08)] text-center bg-gradient-to-b from-white to-[#EEF8F1]/40">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#168A4A]">{stats.potentialMatches}</span>
            <span className="block text-xs font-semibold text-[#168A4A] mt-1">AI Potential Matches</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] text-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#35B86B]">{stats.recoveryRate}%</span>
            <span className="block text-xs font-semibold text-[#66756C] mt-1">Recovery Success Rate</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] text-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#102018]">24/7</span>
            <span className="block text-xs font-semibold text-[#66756C] mt-1">Automated AI Discovery</span>
          </div>
        </div>
      </section>

      {/* 5-Step Process Section */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[#E3ECE6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF8F1] border border-[#D5ECD9] text-[#168A4A] text-xs font-bold uppercase tracking-wider">
              <span>The FindIt AI Process</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#102018] tracking-tight">
              From Lost to Found in 5 Streamlined Steps
            </h2>
            <p className="text-sm text-[#66756C] font-medium">
              A structured protocol that guarantees fast campus item recovery while preventing wrongful claims.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Step 1 */}
            <div className="rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] p-6 flex flex-col justify-between hover:border-[#35B86B] transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] font-extrabold text-sm">
                  01
                </div>
                <h3 className="font-bold text-base text-[#102018]">Report</h3>
                <p className="text-xs text-[#66756C] leading-relaxed">
                  Submit item title, campus location, date, photos, and distinctive marks.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#168A4A] pt-4 mt-4 border-t border-[#E3ECE6]">
                Takes &lt; 60 seconds
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] p-6 flex flex-col justify-between hover:border-[#35B86B] transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] font-extrabold text-sm">
                  02
                </div>
                <h3 className="font-bold text-base text-[#102018]">Discover</h3>
                <p className="text-xs text-[#66756C] leading-relaxed">
                  Items are indexed in real-time with category, building, and date filtering.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#168A4A] pt-4 mt-4 border-t border-[#E3ECE6]">
                Campus Directory
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] p-6 flex flex-col justify-between hover:border-[#35B86B] transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] font-extrabold text-sm">
                  03
                </div>
                <h3 className="font-bold text-base text-[#102018]">AI Match</h3>
                <p className="text-xs text-[#66756C] leading-relaxed">
                  Gemini AI & fuzzy algorithms calculate similarity scores and generate explanations.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#168A4A] pt-4 mt-4 border-t border-[#E3ECE6]">
                Automatic Alerts
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] p-6 flex flex-col justify-between hover:border-[#35B86B] transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] font-extrabold text-sm">
                  04
                </div>
                <h3 className="font-bold text-base text-[#102018]">Verify</h3>
                <p className="text-xs text-[#66756C] leading-relaxed">
                  Claimants answer verification questions and provide proof of ownership.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#168A4A] pt-4 mt-4 border-t border-[#E3ECE6]">
                Human Verified
              </div>
            </div>

            {/* Step 5 */}
            <div className="rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] p-6 flex flex-col justify-between hover:border-[#35B86B] transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#35B86B] text-white flex items-center justify-center font-extrabold text-sm shadow-md shadow-[#35B86B]/25">
                  05
                </div>
                <h3 className="font-bold text-base text-[#102018]">Recover</h3>
                <p className="text-xs text-[#66756C] leading-relaxed">
                  Finder approves the claim. Contact is safely shared for handover.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#168A4A] pt-4 mt-4 border-t border-[#E3ECE6]">
                Item Resolved 🎉
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Campus Feed */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-[#102018] tracking-tight">Recent Campus Activity</h2>
            <p className="text-xs text-[#66756C] mt-1 font-medium">Live feed of items reported across campus facilities.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#E3ECE6] shadow-sm">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ALL' ? 'bg-[#35B86B] text-white shadow-sm' : 'text-[#66756C] hover:text-[#102018]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('LOST')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'LOST' ? 'bg-[#FFF1F2] text-[#E11D48]' : 'text-[#66756C] hover:text-[#E11D48]'
              }`}
            >
              Lost
            </button>
            <button
              onClick={() => setActiveTab('FOUND')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'FOUND' ? 'bg-[#EEF8F1] text-[#168A4A]' : 'text-[#66756C] hover:text-[#168A4A]'
              }`}
            >
              Found
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.slice(0, 6).map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/items"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-white hover:bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] hover:border-[#35B86B] shadow-sm transition-all"
          >
            <span>Explore All {stats.totalItems}+ Campus Items</span>
            <ArrowRight className="w-4 h-4 text-[#35B86B]" />
          </Link>
        </div>
      </section>

      {/* AI Safety & Privacy Guarantee Banner */}
      <section className="pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white border border-[#D5ECD9] p-8 sm:p-10 shadow-[0_16px_36px_-6px_rgba(22,138,74,0.08)] relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#EEF8F1] text-[#168A4A] text-xs font-bold border border-[#D5ECD9]">
              <ShieldCheck className="w-4 h-4 text-[#35B86B]" />
              <span>Campus Security & Privacy Standard</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#102018]">
              AI Never Decides Ownership. You Do.
            </h3>

            <p className="text-xs sm:text-sm text-[#66756C] leading-relaxed font-medium">
              FindIt AI is strictly designed to assist students and staff in discovering potential connections between lost and found reports. Personal phone numbers and emails remain masked until claims are manually reviewed and approved by the reporting user.
            </p>

            <div className="pt-2 flex flex-wrap gap-3 text-xs font-bold text-[#2D3D34]">
              <span className="flex items-center gap-1.5 bg-[#F7FBF8] px-3 py-1.5 rounded-xl border border-[#E3ECE6]">
                <Check className="w-3.5 h-3.5 text-[#35B86B]" /> Private Data Protected
              </span>
              <span className="flex items-center gap-1.5 bg-[#F7FBF8] px-3 py-1.5 rounded-xl border border-[#E3ECE6]">
                <Check className="w-3.5 h-3.5 text-[#35B86B]" /> Verification Questionnaires
              </span>
              <span className="flex items-center gap-1.5 bg-[#F7FBF8] px-3 py-1.5 rounded-xl border border-[#E3ECE6]">
                <Check className="w-3.5 h-3.5 text-[#35B86B]" /> Zero Automated Approvals
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
