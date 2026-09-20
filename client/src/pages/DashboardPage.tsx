import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Item, PotentialMatch } from '../types/index.js';
import { ItemCard } from '../components/ItemCard.js';
import { AIMatchCard } from '../components/AIMatchCard.js';
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
  const [activeTab, setActiveTab] = useState<'my-items' | 'recent-reports'>('my-items');
  const [recentReports, setRecentReports] = useState<Item[]>([]);
  
  const [claimModalItem, setClaimModalItem] = useState<PotentialMatch | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Fetch authenticated user's personal stats
      const userStatsRes = await api.getUserStats();
      if (userStatsRes.stats) {
        setStats(userStatsRes.stats);
      } else {
        setStats({
          itemsLost: 0,
          itemsFound: 0,
          totalItems: 0,
          resolvedItems: 0,
          activeClaims: 0,
          potentialMatches: 0,
          unreadNotifications: 0,
          recoveryRate: 0
        });
      }

      // 2. Fetch authenticated user's reported items
      const myItemsRes = await api.getItems({ userId: user.id });
      const userReportedItems = myItemsRes.items || [];
      setMyItems(userReportedItems);

      // 3. Fetch recent public campus activity
      const recentRes = await api.getItems({ limit: 6 });
      setRecentReports(recentRes.items || []);

      // 4. Fetch potential matches belonging strictly to the user's reported items
      const matchesGathered: PotentialMatch[] = [];
      for (const item of userReportedItems.slice(0, 6)) {
        try {
          const detailRes = await api.getItemById(item.id);
          if (detailRes.matches && detailRes.matches.length > 0) {
            matchesGathered.push(...detailRes.matches);
          }
        } catch {
          // continue
        }
      }
      setRecentMatches(matchesGathered);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Personalized Greeting & Action Strip */}
      <div className="rounded-3xl bg-white border border-[#E3ECE6] p-6 sm:p-8 shadow-[0_12px_32px_-4px_rgba(22,138,74,0.06),0_4px_10px_-2px_rgba(16,32,24,0.02)] space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
              Welcome back, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-sm font-medium text-[#66756C]">
              Let's find what you're looking for. • <span className="text-[#168A4A] font-bold">{user.campus || 'Central Campus'}</span>
            </p>
          </div>

          <Link
            to="/items"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F7FBF8] hover:bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] transition-all"
          >
            <Search className="w-4 h-4 text-[#35B86B]" />
            <span>Find an Item</span>
          </Link>
        </div>

        {/* Large Primary Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Action Card: Report Lost */}
          <Link
            to="/report/lost"
            className="group p-6 rounded-2xl bg-[#FFF8F8] hover:bg-[#FFF1F2] border border-[#FFE4E6] hover:border-[#FDA4AF] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="text-[11px] font-extrabold text-[#E11D48] uppercase tracking-wider">
                Missing Belongings
              </div>
              <div className="text-lg font-bold text-[#102018] group-hover:text-[#E11D48] transition-colors">
                Report Lost Item
              </div>
              <p className="text-xs text-[#66756C] font-medium">Log your item details & photo for AI matching</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white text-[#E11D48] border border-[#FFE4E6] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
          </Link>

          {/* Action Card: Report Found */}
          <Link
            to="/report/found"
            className="group p-6 rounded-2xl bg-[#EEF8F1] hover:bg-[#E6F7EC] border border-[#D5ECD9] hover:border-[#35B86B] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="text-[11px] font-extrabold text-[#168A4A] uppercase tracking-wider">
                Help a Student
              </div>
              <div className="text-lg font-bold text-[#102018] group-hover:text-[#168A4A] transition-colors">
                Report Found Item
              </div>
              <p className="text-xs text-[#66756C] font-medium">Log an item you picked up on campus</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white text-[#35B86B] border border-[#D5ECD9] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
          </Link>
        </div>
      </div>

      {/* Personalized Statistics Row (Isolated to authenticated user's data) */}
      {isLoading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#66756C] text-xs font-bold">
              <span>My Lost Items</span>
              <span className="w-2 h-2 rounded-full bg-[#E11D48]"></span>
            </div>
            <div className="text-3xl font-extrabold text-[#102018] mt-2">{stats.itemsLost}</div>
            <div className="text-[11px] text-[#66756C] font-medium mt-1">Active searches</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#66756C] text-xs font-bold">
              <span>My Found Items</span>
              <span className="w-2 h-2 rounded-full bg-[#35B86B]"></span>
            </div>
            <div className="text-3xl font-extrabold text-[#102018] mt-2">{stats.itemsFound}</div>
            <div className="text-[11px] text-[#66756C] font-medium mt-1">Logged by you</div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-[#EEF8F1] border border-[#D5ECD9] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.08)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#168A4A] text-xs font-extrabold">
              <span>Potential Matches</span>
              <Sparkles className="w-4 h-4 text-[#35B86B]" />
            </div>
            <div className="text-3xl font-extrabold text-[#168A4A] mt-2">{stats.potentialMatches}</div>
            <div className="text-[11px] text-[#168A4A] font-semibold mt-1">On your reports</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E3ECE6] shadow-[0_8px_24px_-4px_rgba(22,138,74,0.06)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#168A4A] text-xs font-bold">
              <span>Recovered & Resolved</span>
              <TrendingUp className="w-4 h-4 text-[#35B86B]" />
            </div>
            <div className="text-3xl font-extrabold text-[#35B86B] mt-2">{stats.resolvedItems}</div>
            <div className="text-[11px] text-[#66756C] font-medium mt-1">Completed recoveries</div>
          </div>
        </div>
      ) : null}

      {/* AI Potential Matches Spotlight */}
      {recentMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A]">
              <Sparkles className="w-4 h-4 text-[#35B86B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#102018] tracking-tight">AI Potential Match Discoveries</h2>
              <p className="text-xs text-[#66756C] font-medium">High-confidence similarities discovered on your reports</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentMatches.map((m) => (
              <AIMatchCard
                key={m.match_id}
                match={m}
                originItemId={m.lost_item_id || m.found_item_id || ''}
                onClaimClick={(itemToClaim) => setClaimModalItem(itemToClaim)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3ECE6] pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('my-items')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'my-items'
                  ? 'bg-[#35B86B] text-white shadow-sm shadow-[#35B86B]/25'
                  : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
              }`}
            >
              My Reported Items ({myItems.length})
            </button>
            <button
              onClick={() => setActiveTab('recent-reports')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
            className="text-xs font-bold text-[#168A4A] hover:text-[#116B3A] flex items-center gap-1"
          >
            <span>View Full Directory</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#35B86B]" />
          </Link>
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : activeTab === 'my-items' ? (
          myItems.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E3ECE6] p-12 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#102018]">No active lost or found reports yet</h3>
              <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
                Hopefully you won't lose anything — but we're ready whenever you do!
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Link
                  to="/report/lost"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]"
                >
                  Report Lost Item
                </Link>
                <Link
                  to="/report/found"
                  className="btn-primary px-4 py-2 text-xs"
                >
                  Report Found Item
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentReports.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

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
