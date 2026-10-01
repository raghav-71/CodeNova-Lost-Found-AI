import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { uploadAvatarToSupabase, isSupabaseConfigured } from '../services/supabase.js';
import { 
  User, 
  Mail, 
  Building, 
  Phone, 
  Sparkles, 
  Shield, 
  CheckCircle2, 
  LogOut, 
  Layers, 
  TrendingUp, 
  Clock,
  Camera
} from 'lucide-react';

const AVATAR_SEEDS = ['Alex', 'Sarah', 'Marcus', 'Priya', 'Jordan', 'Taylor', 'Sam', 'Riley'];

interface UserStatsSummary {
  itemsLost: number;
  itemsFound: number;
  resolvedItems: number;
  potentialMatches: number;
}

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [campus, setCampus] = useState(user?.campus || 'Central Campus • Undergraduate');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [userStats, setUserStats] = useState<UserStatsSummary | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.getUserStats();
        if (res?.stats) {
          setUserStats({
            itemsLost: res.stats.itemsLost || 0,
            itemsFound: res.stats.itemsFound || 0,
            resolvedItems: res.stats.resolvedItems || 0,
            potentialMatches: res.stats.potentialMatches || 0
          });
        }
      } catch {
        // ignore
      }
    }
    loadStats();
  }, []);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        campus: campus.trim(),
        phone: phone.trim() || undefined,
        avatar
      });
      updateUser(res.user);
      showToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your personal settings have been saved.'
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not update profile.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
          Student Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#66756C] mt-1 font-medium">
          Manage your campus affiliation, privacy preferences, and contact details
        </p>
      </div>

      {/* Relevant User Activity Statistics Summary Card */}
      {userStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-[#E3ECE6] shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-extrabold text-[#102018]">{userStats.itemsLost}</span>
            <span className="block text-[11px] font-bold text-[#66756C] mt-0.5">Lost Items</span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#E3ECE6] shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-extrabold text-[#102018]">{userStats.itemsFound}</span>
            <span className="block text-[11px] font-bold text-[#66756C] mt-0.5">Found Items</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-extrabold text-[#168A4A]">{userStats.potentialMatches}</span>
            <span className="block text-[11px] font-bold text-[#168A4A] mt-0.5">AI Matches</span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#E3ECE6] shadow-sm text-center">
            <span className="text-xl sm:text-2xl font-extrabold text-[#35B86B]">{userStats.resolvedItems}</span>
            <span className="block text-[11px] font-bold text-[#66756C] mt-0.5">Resolved Items</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Left Col: Avatar & Account Meta */}
        <div className="rounded-3xl bg-white border border-[#E3ECE6] p-5 sm:p-7 space-y-5 card-3d text-center">
          <div className="relative inline-block">
            <img
              src={avatar || user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
              alt={user.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-brand-200 shadow-md mx-auto bg-[#EEF8F1]"
            />
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#102018]">{user.name}</h2>
            <div className="inline-block text-xs text-brand-700 bg-[#EEF8F1] px-2.5 py-0.5 rounded-full font-semibold mt-1">
              {user.campus}
            </div>
            <div className="text-xs text-[#66756C] mt-1 truncate">{user.email}</div>
          </div>

          {/* Quick Avatar Seeds & Custom Upload */}
          <div className="pt-4 border-t border-[#E3ECE6] space-y-3">
            <div className="text-xs font-semibold text-[#102018]">Choose Profile Avatar</div>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_SEEDS.map((seed) => {
                const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setAvatar(url)}
                    className={`p-1 rounded-xl border transition-all touch-target flex items-center justify-center ${
                      avatar === url
                        ? 'border-brand-500 bg-[#EEF8F1] shadow-sm scale-105'
                        : 'border-[#E3ECE6] bg-[#F7FBF8] hover:border-brand-300'
                    }`}
                  >
                    <img src={url} alt={seed} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg mx-auto" />
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-dashed border-[#C7EED4] bg-[#F7FBF8] hover:bg-[#EEF8F1] text-brand-700 cursor-pointer transition-colors touch-target">
                <Camera className="w-4 h-4 text-brand-600" />
                <span>Upload Custom Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (isSupabaseConfigured && user) {
                      try {
                        const url = await uploadAvatarToSupabase(file, user.id);
                        setAvatar(url);
                        showToast({ type: 'success', title: 'Avatar Uploaded', message: 'Stored in Supabase Storage' });
                      } catch (err: any) {
                        showToast({ type: 'error', title: 'Upload Failed', message: err.message });
                      }
                    } else {
                      const reader = new FileReader();
                      reader.onload = () => setAvatar(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Edit Form & Sign Out */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-5 sm:p-8 card-3d">
            <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                  Campus Email (Verified)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-[#E3ECE6] text-[#66756C] text-xs sm:text-sm cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                  Campus Department / Faculty
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                  <input
                    type="text"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    placeholder="e.g. North Campus • Computer Science"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#102018] mb-1.5">
                  Private Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66756C]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-[#102018] text-xs sm:text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#66756C] mt-1 font-medium">
                  Your phone is kept private and only released upon verified claim approvals.
                </p>
              </div>

              <div className="pt-3 border-t border-[#E3ECE6] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary w-full sm:w-auto px-6 py-2.5 text-xs font-bold touch-target flex items-center justify-center"
                >
                  {isSaving ? <span>Saving...</span> : <span>Save Changes</span>}
                </button>
              </div>
            </form>
          </div>

          {/* Account Logout Box */}
          <div className="p-5 rounded-3xl bg-white border border-[#FFE4E6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <div className="text-xs font-bold text-[#E11D48]">Campus Session</div>
              <div className="text-xs text-[#66756C]">End your authenticated student session on this device</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#E11D48] bg-[#FFF1F2] border border-[#FFE4E6] hover:bg-[#FFE4E6] transition-colors touch-target flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
