import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Item } from '../types/index.js';
import { ItemCard } from '../components/ItemCard.js';
import { CardSkeleton } from '../components/SkeletonLoader.js';
import { Layers, PlusCircle, Trash2, CheckCircle2 } from 'lucide-react';

export function MyItemsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadMyItems();
  }, [user]);

  const loadMyItems = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.getItems({ userId: user.id });
      setItems(res.items || []);
    } catch (err) {
      console.error('Failed to load my items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkResolved = async (itemId: string) => {
    try {
      await api.updateItem(itemId, { status: 'RESOLVED' });
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: 'Item marked as Resolved and Recovered.'
      });
      loadMyItems();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to update item status.'
      });
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to remove this report?')) return;
    try {
      await api.deleteItem(itemId);
      showToast({
        type: 'info',
        title: 'Item Deleted',
        message: 'Report has been permanently removed.'
      });
      loadMyItems();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to delete item.'
      });
    }
  };

  const filtered = items.filter(item => {
    if (filterType !== 'ALL' && item.type !== filterType) return false;
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
            My Submitted Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#66756C] mt-1 font-medium">
            Manage your campus lost and found listings, AI match notifications, and status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/report/lost"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6] hover:bg-[#FFE4E6] transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Lost</span>
          </Link>
          <Link
            to="/report/found"
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Found</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-white border border-[#E3ECE6] shadow-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === 'ALL' ? 'bg-[#35B86B] text-white' : 'text-[#66756C] hover:text-[#102018]'
            }`}
          >
            All Reports ({items.length})
          </button>
          <button
            onClick={() => setFilterType('LOST')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === 'LOST' ? 'bg-[#FFF1F2] text-[#E11D48]' : 'text-[#66756C] hover:text-[#E11D48]'
            }`}
          >
            Lost ({items.filter(i => i.type === 'LOST').length})
          </button>
          <button
            onClick={() => setFilterType('FOUND')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === 'FOUND' ? 'bg-[#EEF8F1] text-[#168A4A]' : 'text-[#66756C] hover:text-[#168A4A]'
            }`}
          >
            Found ({items.filter(i => i.type === 'FOUND').length})
          </button>
        </div>

        {/* Status Dropdown */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-xs font-medium text-[#102018] focus:outline-none focus:border-[#35B86B]"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Search</option>
          <option value="MATCH_FOUND">Potential Match Found</option>
          <option value="CLAIM_PENDING">Claim Pending</option>
          <option value="RESOLVED">Resolved / Recovered</option>
        </select>
      </div>

      {/* Grid of Items */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border border-[#E3ECE6] p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#102018]">No reports match filter criteria</h3>
          <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
            You currently have no submitted reports matching the chosen category or status.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div key={item.id} className="relative group/card flex flex-col justify-between">
              <ItemCard item={item} />
              
              {/* Quick Owner Actions Strip */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-[#E3ECE6] flex items-center justify-between text-xs shadow-sm">
                {item.status !== 'RESOLVED' ? (
                  <button
                    onClick={() => handleMarkResolved(item.id)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#168A4A] hover:text-[#116B3A] transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#35B86B]" />
                    <span>Mark as Resolved</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-[#168A4A] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#35B86B]" />
                    <span>Completed 🎉</span>
                  </span>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-[#94A39B] hover:text-[#E11D48] transition-colors rounded"
                  title="Delete Report"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
