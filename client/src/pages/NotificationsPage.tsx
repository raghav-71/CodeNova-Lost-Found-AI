import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { NotificationItem } from '../types/index.js';
import { Bell, Sparkles, Check, CheckCircle2, ShieldCheck, ArrowRight, Clock } from 'lucide-react';

export function NotificationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      showToast({
        type: 'success',
        title: 'Updated',
        message: 'All notifications marked as read.'
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to mark all as read.'
      });
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#102018] tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#EEF8F1] flex items-center justify-center text-brand-600 shadow-sm shrink-0">
              <Bell className="w-5 h-5 text-[#35B86B]" />
            </div>
            <span>Campus Notification Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#66756C] mt-1 font-medium">
            Real-time updates regarding AI potential matches, claim submissions, and recoveries
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#EEF8F1] hover:bg-[#E0F2E7] text-brand-700 transition-all shadow-sm touch-target self-start sm:self-auto"
          >
            <Check className="w-3.5 h-3.5 text-brand-600" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
            filter === 'all'
              ? 'bg-[#35B86B] text-white shadow-sm shadow-[#35B86B]/20'
              : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
            filter === 'unread'
              ? 'bg-[#35B86B] text-white shadow-sm shadow-[#35B86B]/20'
              : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#66756C] bg-white rounded-3xl border border-[#E3ECE6] card-3d">
          Loading notifications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border border-[#E3ECE6] p-8 sm:p-12 text-center space-y-4 card-3d">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EEF8F1] flex items-center justify-center mx-auto text-brand-600 shadow-inner">
            <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-[#35B86B]" />
          </div>
          <h3 className="text-base font-bold text-[#102018]">No notifications</h3>
          <p className="text-xs text-[#66756C] max-w-sm mx-auto">
            You are completely up to date. We'll alert you whenever an AI match or claim occurs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-3 sm:gap-4 card-3d ${
                !n.is_read
                  ? 'bg-[#F2FAF5] border-brand-200 shadow-md'
                  : 'bg-white border-[#E3ECE6]'
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  n.type === 'AI_MATCH'
                    ? 'bg-[#E6F7EC] text-brand-600 border border-brand-200'
                    : n.type === 'CLAIM_APPROVED'
                    ? 'bg-[#E6F7EC] text-brand-700 border border-brand-200'
                    : n.type === 'CLAIM_RECEIVED'
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : 'bg-[#EEF8F1] text-brand-700 border border-brand-200'
                }`}>
                  {n.type === 'AI_MATCH' && <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#35B86B]" />}
                  {n.type === 'CLAIM_APPROVED' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#35B86B]" />}
                  {n.type === 'CLAIM_RECEIVED' && <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />}
                  {n.type !== 'AI_MATCH' && n.type !== 'CLAIM_APPROVED' && n.type !== 'CLAIM_RECEIVED' && <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-[#35B86B]" />}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#102018] truncate">{n.title}</h4>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shrink-0"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#94A39B] font-medium flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(n.created_at)}</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#66756C] leading-relaxed break-words-anywhere">{n.message}</p>
                  
                  {n.link_url && (
                    <div className="pt-1.5">
                      <Link
                        to={n.link_url}
                        onClick={() => handleMarkRead(n.id)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 transition-colors touch-target py-1"
                      >
                        <span>View Related Record</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-xs text-[#66756C] hover:text-[#102018] p-2 rounded-xl hover:bg-black/5 shrink-0 transition-colors touch-target flex items-center justify-center"
                  title="Mark as read"
                  aria-label="Mark notification as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
