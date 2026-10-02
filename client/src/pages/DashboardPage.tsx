import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Item, PotentialMatch } from '../types/index.js';
import { ItemCard } from '../components/ItemCard.js';
import { AIMatchCard } from '../components/AIMatchCard.js';
import { MatchDetailsModal } from '../components/MatchDetailsModal.js';
import { ClaimModal } from '../components/ClaimModal.js';
import { StatsSkeleton, CardSkeleton } from '../components/SkeletonLoader.js';
import { 
  Sparkles, 
  PlusCircle, 
  Search, 
  ArrowRight, 
  Layers, 
  TrendingUp,
  Inbox
} from 'lucide-react';

interface PersonalDashboardStats {
  itemsLost: number;
  itemsFound: number;
  totalItems: number;
  resolvedItems: number;
  activeClaims: number;
  potentialMatches: number;
  unreadNotifications: number;
  recoveryRate: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PersonalDashboardStats | null>(null);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [recentMatches, setRecentMatches] = useState<PotentialMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-items' | 'recent-reports'>('my-items');
  const [recentReports, setRecentReports] = useState<Item[]>([]);
  const [claimModalItem, setClaimModalItem] = useState<PotentialMatch | null>(null);
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<PotentialMatch | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      // 1. Fetch authenticated user's personal stats from Supabase
      const userStatsRes = await api.getUserStats();
      if (userStatsRes && userStatsRes.stats) {
        setStats(userStatsRes.stats);
      } else {
        throw new Error('Personal statistics could not be loaded.');
      }

      // 2. Fetch authenticated user's reported items using strict user-scoped endpoint
      const myItemsRes = await api.getMyItems();
      const userReportedItems = myItemsRes.items || [];
      setMyItems(userReportedItems);

      // 3. Fetch recent public campus activity
      const recentRes = await api.getItems({ limit: 6 });
      setRecentReports(recentRes.items || []);

      // 4. Fetch potential matches belonging strictly to the user's reported items (single query)
      try {
        const matchesRes = await api.getMyMatches();
        setRecentMatches(matchesRes.matches || []);
      } catch (matchErr) {
        console.warn('Failed to load my matches:', matchErr);
        setRecentMatches([]);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setLoadError('Unable to load your dashboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Personalized Greeting & Action Strip */}
      <div className="rounded-3xl bg-white border border-[#E3ECE6] p-5 sm:p-8 shadow-[0_10px_28px_-4px_rgba(22,138,74,0.06),0_4px_10px_-2px_rgba(16,32,24,0.02)] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#102018] tracking-tight truncate">
              Welcome back, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#66756C] truncate">
              Campus Hub • <span className="text-[#168A4A] font-bold">{user.campus || 'Central Campus'}</span>
            </p>
          </div>

          <Link
            to="/items"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F7FBF8] hover:bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] transition-all touch-target"
          >
            <Search className="w-4 h-4 text-[#35B86B]" />
            <span>Search Directory</span>
          </Link>
        </div>

        {/* Large Primary Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
          {/* Action Card: Report Lost */}
          <Link
            to="/report/lost"
            className="group p-4 sm:p-6 rounded-2xl bg-[#FFF8F8] hover:bg-[#FFF1F2] border border-[#FFE4E6] hover:border-[#FDA4AF] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between active:scale-[0.99]"
          >
            <div className="space-y-1 pr-2">
              <div className="text-[10px] sm:text-[11px] font-extrabold text-[#E11D48] uppercase tracking-wider">
                Missing Belongings
              </div>
              <div className="text-base sm:text-lg font-bold text-[#102018] group-hover:text-[#E11D48] transition-colors">
                Report Lost Item
              </div>
              <p className="text-xs text-[#66756C] font-medium line-clamp-1">AI searches campus records automatically</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white text-[#E11D48] border border-[#FFE4E6] flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </Link>

          {/* Action Card: Report Found */}
          <Link
            to="/report/found"
            className="group p-4 sm:p-6 rounded-2xl bg-[#EEF8F1] hover:bg-[#E6F7EC] border border-[#D5ECD9] hover:border-[#35B86B] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between active:scale-[0.99]"
          >
            <div className="space-y-1 pr-2">
              <div className="text-[10px] sm:text-[11px] font-extrabold text-[#168A4A] uppercase tracking-wider">
                Help a Student
              </div>
              <div className="text-base sm:text-lg font-bold text-[#102018] group-hover:text-[#168A4A] transition-colors">
                Report Found Item
              </div>
              <p className="text-xs text-[#66756C] font-medium line-clamp-1">Log an item you picked up on campus</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white text-[#35B86B] border border-[#D5ECD9] flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </Link>
        </div>
      </div>

      {/* Personalized Statistics Row (Isolated to authenticated user's real Supabase data) */}
      {loadError ? (
        <div className="p-5 rounded-2xl bg-[#FFF8F8] border border-[#FFE4E6] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="text-xs sm:text-sm font-bold text-[#E11D48]">{loadError}</div>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#E11D48] text-white hover:bg-[#BE123C] transition-all touch-target"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#66756C] text-[11px] sm:text-xs font-bold">
              <span>My Lost Items</span>
              <span className="w-2 h-2 rounded-full bg-[#E11D48] shrink-0"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#102018] mt-2">{stats.itemsLost}</div>
            <div className="text-[10px] sm:text-[11px] text-[#66756C] font-medium mt-1 truncate">Active reports</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#66756C] text-[11px] sm:text-xs font-bold">
              <span>My Found Items</span>
              <span className="w-2 h-2 rounded-full bg-[#35B86B] shrink-0"></span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#102018] mt-2">{stats.itemsFound}</div>
            <div className="text-[10px] sm:text-[11px] text-[#66756C] font-medium mt-1 truncate">Logged by you</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-white to-[#EEF8F1] border border-[#D5ECD9] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.08)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#168A4A] text-[11px] sm:text-xs font-extrabold">
              <span>Potential Matches</span>
              <Sparkles className="w-3.5 h-3.5 text-[#35B86B] shrink-0" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#168A4A] mt-2">{stats.potentialMatches}</div>
            <div className="text-[10px] sm:text-[11px] text-[#168A4A] font-semibold mt-1 truncate">AI recommendations</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#168A4A] text-[11px] sm:text-xs font-bold">
              <span>Recovered & Resolved</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#35B86B] shrink-0" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#35B86B] mt-2">{stats.resolvedItems}</div>
            <div className="text-[10px] sm:text-[11px] text-[#66756C] font-medium mt-1 truncate">Verified recoveries</div>
          </div>
        </div>
      ) : null}

      {/* AI Potential Matches Spotlight */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] shrink-0">
            <Sparkles className="w-4 h-4 text-[#35B86B]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#102018] tracking-tight">AI Potential Match Discoveries</h2>
            <p className="text-xs text-[#66756C] font-medium">Automatic cross-user matching on your reports</p>
          </div>
        </div>

        {recentMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {recentMatches.map((m) => (
              <AIMatchCard
                key={m.match_id}
                match={m}
                originItemId={m.origin_item_id || m.lost_item_id || m.found_item_id || ''}
                onClaimClick={(itemToClaim) => setClaimModalItem(itemToClaim)}
                onViewDetails={(itemToView) => setSelectedMatchForModal(itemToView)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-[#E3ECE6] p-6 text-center space-y-2">
            <p className="text-sm font-bold text-[#102018]">No potential matches yet.</p>
            <p className="text-xs text-[#66756C]">FindIt AI will automatically check new reports for you in the background.</p>
          </div>
        )}
      </div>

      {/* Main Content Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3ECE6] pb-3">
          {/* Scrollable touch-friendly tab pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveTab('my-items')}
              className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
                activeTab === 'my-items'
                  ? 'bg-[#35B86B] text-white shadow-sm shadow-[#35B86B]/25'
                  : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
              }`}
            >
              My Reported Items ({myItems.length})
            </button>
            <button
              onClick={() => setActiveTab('recent-reports')}
              className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
                activeTab === 'recent-reports'
                  ? 'bg-[#35B86B] text-white shadow-sm shadow-[#35B86B]/25'
                  : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
              }`}
            >
              Recent Campus Activity
            </button>
          </div>

          <Link
            to="/items"
            className="text-xs font-bold text-[#168A4A] hover:text-[#116B3A] flex items-center gap-1 self-start sm:self-auto pt-1 sm:pt-0"
          >
            <span>View Full Directory</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#35B86B]" />
          </Link>
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : activeTab === 'my-items' ? (
          myItems.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E3ECE6] p-8 sm:p-12 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
                <Layers className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#102018]">No active lost or found reports yet</h3>
                <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
                  Hopefully you won't lose anything — but we're ready whenever you do!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-2.5 pt-2">
                <Link
                  to="/report/lost"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6] touch-target flex items-center justify-center"
                >
                  Report Lost Item
                </Link>
                <Link
                  to="/report/found"
                  className="btn-primary px-4 py-2.5 text-xs touch-target flex items-center justify-center"
                >
                  Report Found Item
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {myItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recentReports.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Match Details Side-by-Side Modal */}
      {selectedMatchForModal && (
        <MatchDetailsModal
          isOpen={true}
          match={selectedMatchForModal}
          originItem={myItems.find(i => i.id === selectedMatchForModal.origin_item_id || i.id === selectedMatchForModal.lost_item_id || i.id === selectedMatchForModal.found_item_id) || null}
          onClose={() => setSelectedMatchForModal(null)}
          onClaimClick={(itemToClaim) => {
            setSelectedMatchForModal(null);
            setClaimModalItem(itemToClaim);
          }}
        />
      )}

      {/* Claim Modal */}
      {claimModalItem && (
        <ClaimModal
          item={claimModalItem}
          isOpen={true}
          onClose={() => setClaimModalItem(null)}
          onSuccess={() => {
            setClaimModalItem(null);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
