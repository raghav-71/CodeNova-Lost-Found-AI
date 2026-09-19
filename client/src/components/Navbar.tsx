import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { NotificationItem } from '../types/index.js';
import { 
  Sparkles, 
  Search, 
  PlusCircle, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X, 
  CheckCircle2, 
  Layers, 
  FileText, 
  LayoutDashboard,
  Home
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifDropdownOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications.slice(0, 5));
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E3ECE6] shadow-[0_2px_12px_rgba(16,32,24,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-[#35B86B]/30 shadow-md shadow-[#35B86B]/20 group-hover:scale-105 transition-transform duration-300 bg-white">
              <img 
                src="/logo.png" 
                alt="FindIt AI Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#102018] flex items-center gap-1.5">
                <span>FindIt</span>
                <span className="text-[#35B86B]">AI</span>
              </span>
              <span className="text-[10px] font-bold text-[#168A4A] tracking-wider uppercase -mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#35B86B]"></span>
                Campus Lost & Found
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive('/')
                  ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                  : 'text-[#66756C] hover:text-[#102018] hover:bg-[#F7FBF8]'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>

            <Link
              to="/items"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive('/items')
                  ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                  : 'text-[#66756C] hover:text-[#102018] hover:bg-[#F7FBF8]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Items</span>
            </Link>

            {user && (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive('/dashboard')
                      ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                      : 'text-[#66756C] hover:text-[#102018] hover:bg-[#F7FBF8]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/my-items"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive('/my-items')
                      ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                      : 'text-[#66756C] hover:text-[#102018] hover:bg-[#F7FBF8]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>My Items</span>
                </Link>

                <Link
                  to="/claims"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive('/claims')
                      ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                      : 'text-[#66756C] hover:text-[#102018] hover:bg-[#F7FBF8]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Claims</span>
                </Link>
              </>
            )}
          </div>

          {/* Right Section / Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            {user ? (
              <>
                {/* Quick Report Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to="/report/lost"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6] hover:bg-[#FFE4E6] transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Report Lost</span>
                  </Link>
                  <Link
                    to="/report/found"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#35B86B] text-white hover:bg-[#239E55] shadow-sm shadow-[#35B86B]/30 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Report Found</span>
                  </Link>
                </div>

                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="relative p-2.5 rounded-xl text-[#66756C] hover:text-[#102018] hover:bg-[#EEF8F1] transition-colors border border-[#E3ECE6]"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E11D48] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white border border-[#E3ECE6] shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between pb-3 border-b border-[#E3ECE6]">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#35B86B]" />
                          <span className="font-bold text-sm text-[#102018]">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-bold bg-[#EEF8F1] text-[#168A4A] px-2 py-0.5 rounded-full border border-[#D5ECD9]">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-[#66756C] hover:text-[#168A4A] transition-colors font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-[#E3ECE6] max-h-80 overflow-y-auto my-2">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-[#66756C]">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              to={n.link_url || '/notifications'}
                              onClick={() => setNotifDropdownOpen(false)}
                              className={`block p-3 rounded-xl transition-colors ${
                                !n.is_read ? 'bg-[#EEF8F1]/70 hover:bg-[#EEF8F1]' : 'hover:bg-[#F7FBF8]'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-[#35B86B]' : 'bg-transparent'}`}></span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-[#102018] truncate">{n.title}</div>
                                  <div className="text-[11px] text-[#66756C] line-clamp-2 mt-0.5">{n.message}</div>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E3ECE6] text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setNotifDropdownOpen(false)}
                          className="text-xs font-bold text-[#168A4A] hover:text-[#116B3A] transition-colors"
                        >
                          View all notifications →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile Menu */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2 rounded-xl hover:bg-[#F7FBF8] border border-[#E3ECE6] transition-colors"
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-7 h-7 rounded-lg object-cover border border-[#E3ECE6] bg-[#EEF8F1]"
                    />
                    <span className="text-xs font-bold text-[#102018] max-w-[110px] truncate">{user.name}</span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white border border-[#E3ECE6] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-3 border-b border-[#E3ECE6]">
                        <div className="text-sm font-bold text-[#102018] truncate">{user.name}</div>
                        <div className="text-xs text-[#66756C] truncate">{user.email}</div>
                        <div className="text-[11px] font-semibold text-[#168A4A] mt-1 truncate">{user.campus}</div>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102018] hover:bg-[#EEF8F1] transition-colors"
                        >
                          <UserIcon className="w-4 h-4 text-[#35B86B]" />
                          <span>Profile & Settings</span>
                        </Link>
                        <Link
                          to="/my-items"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102018] hover:bg-[#EEF8F1] transition-colors"
                        >
                          <Layers className="w-4 h-4 text-[#35B86B]" />
                          <span>My Items</span>
                        </Link>
                        <Link
                          to="/claims"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102018] hover:bg-[#EEF8F1] transition-colors"
                        >
                          <FileText className="w-4 h-4 text-[#35B86B]" />
                          <span>Claims</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-[#E3ECE6]">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#E11D48] hover:bg-[#FFF1F2] transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#102018] hover:bg-[#F7FBF8] border border-[#E3ECE6] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary px-4 py-2 text-xs"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link
                to="/notifications"
                className="relative p-2 rounded-xl text-[#66756C] hover:bg-[#F7FBF8] border border-[#E3ECE6]"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E11D48] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#102018] hover:bg-[#F7FBF8] border border-[#E3ECE6]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E3ECE6] bg-white px-4 py-6 space-y-4 shadow-xl animate-in fade-in slide-in-from-top-2">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6]">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover border border-[#E3ECE6] bg-[#EEF8F1]"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#102018] truncate">{user.name}</div>
                  <div className="text-xs text-[#66756C] truncate">{user.email}</div>
                  <div className="text-[11px] font-semibold text-[#168A4A] mt-0.5">{user.campus}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/report/lost"
                  className="p-2.5 rounded-xl text-center bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6] text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Report Lost</span>
                </Link>
                <Link
                  to="/report/found"
                  className="p-2.5 rounded-xl text-center bg-[#35B86B] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-[#35B86B]/30"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Report Found</span>
                </Link>
              </div>

              <div className="space-y-1">
                <Link
                  to="/"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#102018] hover:bg-[#EEF8F1]"
                >
                  <Home className="w-4 h-4 text-[#35B86B]" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/items"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#102018] hover:bg-[#EEF8F1]"
                >
                  <Search className="w-4 h-4 text-[#35B86B]" />
                  <span>Find Items</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#102018] hover:bg-[#EEF8F1]"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#35B86B]" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/my-items"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#102018] hover:bg-[#EEF8F1]"
                >
                  <Layers className="w-4 h-4 text-[#35B86B]" />
                  <span>My Items</span>
                </Link>
                <Link
                  to="/claims"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#102018] hover:bg-[#EEF8F1]"
                >
                  <FileText className="w-4 h-4 text-[#35B86B]" />
                  <span>Claims</span>
                </Link>
                <Link
                  to="/notifications"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#102018] hover:bg-[#EEF8F1]"
                >
                  <Bell className="w-4 h-4 text-[#35B86B]" />
                  <span>Notifications</span>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#102018] hover:bg-[#EEF8F1]"
                >
                  <UserIcon className="w-4 h-4 text-[#35B86B]" />
                  <span>Profile Settings</span>
                </Link>
              </div>

              <div className="pt-2 border-t border-[#E3ECE6]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-[#E11D48] bg-[#FFF1F2] border border-[#FFE4E6]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Link
                to="/"
                className="block px-3 py-2 text-xs font-bold text-[#102018] hover:bg-[#F7FBF8] rounded-xl"
              >
                Home
              </Link>
              <Link
                to="/items"
                className="block px-3 py-2 text-xs font-bold text-[#102018] hover:bg-[#F7FBF8] rounded-xl"
              >
                Find Items
              </Link>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E3ECE6]">
                <Link
                  to="/login"
                  className="p-2.5 rounded-xl text-center text-xs font-bold border border-[#E3ECE6] text-[#102018]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="p-2.5 rounded-xl text-center text-xs font-bold btn-primary"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
