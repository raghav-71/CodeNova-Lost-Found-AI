import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Item, PotentialMatch, Claim } from '../types/index.js';
import { StatusBadge, TypeBadge } from '../components/StatusBadge.js';
import { StatusTimeline } from '../components/StatusTimeline.js';
import { AIMatchCard } from '../components/AIMatchCard.js';
import { ClaimModal } from '../components/ClaimModal.js';
import { ContactModal } from '../components/ContactModal.js';
import { MultimodalAnalysisBadge } from '../components/MultimodalAnalysisBadge.js';
import { DetailSkeleton } from '../components/SkeletonLoader.js';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  Tag, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ArrowLeft, 
  Check, 
  FileText,
  Mail,
  UserCheck,
  XCircle,
  HelpCircle
} from 'lucide-react';

export function ItemDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [matches, setMatches] = useState<PotentialMatch[]>([]);
  const [userClaim, setUserClaim] = useState<Claim | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRematching, setIsRematching] = useState(false);
  
  // Claim Modal
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimTargetItem, setClaimTargetItem] = useState<Item | PotentialMatch | null>(null);

  // Contact Modal
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactTarget, setContactTarget] = useState<{
    title: string;
    role: 'Finder' | 'Claimant';
    contact: {
      name?: string;
      email?: string;
      phone?: string;
      campus?: string;
      avatar?: string;
    };
    itemName?: string;
  } | null>(null);

  const loadItemDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.getItemById(id);
      setItem(res.item);
      setIsOwner(res.isOwner);
      setMatches(res.matches || []);
      setUserClaim(res.userClaim || null);
      setClaims(res.claims || []);
    } catch (err: any) {
      console.error('Failed to load item:', err);
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to load item details.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadItemDetails();
  }, [loadItemDetails]);

  const handleRematch = async () => {
    if (!id) return;
    setIsRematching(true);
    try {
      const res = await api.rematchItem(id);
      showToast({
        type: 'info',
        title: 'AI Matching Complete',
        message: `Discovered ${res.matchesFound} potential matching records.`
      });
      loadItemDetails();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Matching Failed',
        message: err.message || 'Could not execute AI rematch.'
      });
    } finally {
      setIsRematching(false);
    }
  };

  const handleClaimStatusUpdate = async (claimId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await api.updateClaimStatus(claimId, newStatus);
      if (newStatus === 'APPROVED') {
        showToast({
          type: 'success',
          title: 'Claim Approved! 🎉',
          message: 'Contact details unlocked. You can now coordinate handover with the claimant.'
        });
      } else {
        showToast({
          type: 'info',
          title: 'Claim Rejected',
          message: 'Claim request updated.'
        });
      }
      loadItemDetails();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Failed to update claim.'
      });
    }
  };

  const handleResolveClaim = async (claimId: string) => {
    const confirmResolve = window.confirm(
      'Confirm that you have received / handed over this item? This will mark the item and claim as RESOLVED.'
    );
    if (!confirmResolve) return;

    try {
      await api.resolveClaim(claimId);
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      });
      showToast({
        type: 'success',
        title: 'Item Returned! 🎉',
        message: 'The item has been successfully resolved and returned.'
      });
      loadItemDetails();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Resolution Failed',
        message: err.message || 'Could not mark item as resolved.'
      });
    }
  };

  const handleCancelClaim = async (claimId: string) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this claim?');
    if (!confirmCancel) return;

    try {
      await api.cancelClaim(claimId);
      showToast({
        type: 'info',
        title: 'Claim Cancelled',
        message: 'Your claim request has been withdrawn.'
      });
      loadItemDetails();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Cancel Claim',
        message: err.message || 'Could not cancel claim.'
      });
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL.replace('/api', '')}${cleanUrl}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <DetailSkeleton />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#102018]">Item Not Found</h2>
        <p className="text-xs text-[#66756C]">The requested campus record could not be found or has been removed.</p>
        <Link to="/items" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  // Action Box Component (shared for desktop sidebar & mobile natural flow)
  const ActionBox = () => (
    <div className="rounded-3xl bg-white border border-[#D5ECD9] p-5 sm:p-7 shadow-[0_12px_32px_-4px_rgba(22,138,74,0.08)] space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#35B86B]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#102018]">Claim & Recovery Status</h3>
          <p className="text-[11px] text-[#66756C] font-medium">Campus item handover</p>
        </div>
      </div>

      {item.status === 'RESOLVED' ? (
        <div className="p-4 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] text-[#168A4A] text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#35B86B]" />
            <span>Item Returned Successfully 🎉</span>
          </div>
          <p className="text-[11px] text-[#168A4A]/90 font-medium">
            This item has been recovered and verified resolved.
          </p>
        </div>
      ) : userClaim && userClaim.status === 'PENDING' ? (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-[#D97706]" />
              <span>Waiting for finder</span>
            </div>
            <p className="text-[11px] text-[#92400E]/90 font-medium">
              Your claim request has been sent to the person who reported finding it.
            </p>
          </div>
          <button
            onClick={() => handleCancelClaim(userClaim.id)}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-[#E11D48] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FFE4E6] transition-colors"
          >
            Cancel Claim
          </button>
        </div>
      ) : userClaim && userClaim.status === 'APPROVED' ? (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] text-[#168A4A] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#35B86B]" />
              <span>Claim Approved!</span>
            </div>
            <p className="text-[11px] text-[#168A4A]/90 font-medium">
              Contact the finder to coordinate collection of your item.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setContactTarget({
                  title: 'Contact Finder',
                  role: 'Finder',
                  contact: {
                    name: (userClaim as any).finder_name || item.reporter_name,
                    campus: (userClaim as any).finder_campus || item.reporter_campus,
                    email: (userClaim as any).finder_email || (item as any).reporter_email,
                    phone: (userClaim as any).finder_phone || (item as any).reporter_phone,
                    avatar: item.reporter_avatar
                  },
                  itemName: item.title
                });
                setContactModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-white text-[#168A4A] border border-[#D5ECD9] hover:bg-[#EEF8F1] text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Mail className="w-4 h-4 text-[#35B86B]" />
              <span>Contact Finder</span>
            </button>
            <button
              onClick={() => handleResolveClaim(userClaim.id)}
              className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#35B86B]/25"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Received My Item</span>
            </button>
          </div>
        </div>
      ) : userClaim && userClaim.status === 'RESOLVED' ? (
        <div className="p-4 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] text-[#168A4A] text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#35B86B]" />
            <span>Item Returned Successfully 🎉</span>
          </div>
          <p className="text-[11px] text-[#168A4A]/90 font-medium">
            You confirmed receiving this item. Thank you!
          </p>
        </div>
      ) : isOwner ? (
        <div className="p-4 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] text-[#168A4A] text-xs space-y-2">
          <div className="font-bold text-[#168A4A]">You reported this item</div>
          <p className="text-[11px] text-[#2D3D34] leading-relaxed font-medium">
            {claims.length > 0
              ? `You have ${claims.length} claim request(s) waiting for your review below.`
              : 'You will receive notifications whenever a student claims this item or an AI match is detected.'}
          </p>
        </div>
      ) : item.type === 'FOUND' ? (
        <div className="space-y-3">
          <p className="text-xs text-[#66756C] leading-relaxed font-medium">
            Do you believe this found item belongs to you? Submit a claim to connect with the finder.
          </p>
          <button
            onClick={() => {
              setClaimTargetItem(item);
              setIsClaimModalOpen(true);
            }}
            className="btn-primary w-full py-3.5 text-xs sm:text-sm flex items-center justify-center gap-2 touch-target shadow-md shadow-[#35B86B]/25"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Claim Item</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#66756C] leading-relaxed font-medium">
            Found this item on campus? Report it to automatically connect with the student who lost it.
          </p>
          <Link
            to="/report/found"
            className="btn-primary w-full py-3.5 text-xs sm:text-sm flex items-center justify-center gap-2 touch-target shadow-md shadow-[#35B86B]/25"
          >
            <span>Report Matching Found Item</span>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Navigation & Actions Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/items"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#66756C] hover:text-[#102018] transition-colors touch-target"
        >
          <ArrowLeft className="w-4 h-4 text-[#35B86B]" />
          <span>Back to Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRematch}
            disabled={isRematching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] transition-all disabled:opacity-50 shadow-sm touch-target"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#35B86B] ${isRematching ? 'animate-spin' : ''}`} />
            <span>{isRematching ? 'Scanning AI...' : 'Re-run AI Match'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Actions/Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Image, Description, Characteristics, Timeline */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          {/* Main Visual Image Card */}
          <div className="relative rounded-3xl bg-white border border-[#E3ECE6] overflow-hidden shadow-[0_12px_32px_-4px_rgba(22,138,74,0.08)]">
            <div className="aspect-[16/10] sm:aspect-[16/9] w-full bg-[#EEF8F1] overflow-hidden">
              <img
                src={getImageUrl(item.primary_image)}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Top Badges */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2">
              <TypeBadge type={item.type} size="md" />
              <span className="text-[11px] sm:text-xs font-bold bg-white/90 backdrop-blur-md text-[#102018] px-2.5 py-1 rounded-xl border border-white/60 shadow-sm flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#35B86B]" />
                {item.category}
              </span>
            </div>

            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <StatusBadge status={item.status} size="md" />
            </div>
          </div>

          {/* Details Card */}
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-[0_10px_28px_-4px_rgba(22,138,74,0.06)]">
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-[#102018] tracking-tight leading-snug">
                {item.title}
              </h1>
              <p className="text-xs text-[#66756C] font-medium mt-1">
                Reported on {item.date} {item.time ? `at ${item.time}` : ''}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A39B]">Detailed Description</h3>
              <p className="text-sm text-[#2D3D34] leading-relaxed whitespace-pre-line font-medium break-words-anywhere">
                {item.description}
              </p>
            </div>

            {/* Distinguishing Characteristics */}
            {item.characteristics && (
              <div className="p-4 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#168A4A]">
                  <Sparkles className="w-4 h-4 text-[#35B86B] shrink-0" />
                  <span>Distinctive Characteristics & Identifying Marks</span>
                </div>
                <p className="text-xs text-[#2D3D34] leading-relaxed font-medium break-words-anywhere">
                  {item.characteristics}
                </p>
              </div>
            )}

            {/* Location & Time Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-4 border-t border-[#E3ECE6]">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] shrink-0">
                  <MapPin className="w-5 h-5 text-[#35B86B]" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#94A39B] uppercase">Campus Location</div>
                  <div className="text-sm font-bold text-[#102018]">{item.location}</div>
                  {item.building_zone && (
                    <div className="text-xs text-[#168A4A] font-semibold">{item.building_zone}</div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] shrink-0">
                  <Calendar className="w-5 h-5 text-[#35B86B]" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#94A39B] uppercase">Date & Time Logged</div>
                  <div className="text-sm font-bold text-[#102018]">{item.date}</div>
                  {item.time && <div className="text-xs text-[#66756C] font-medium">{item.time}</div>}
                </div>
              </div>
            </div>

            {/* Mobile Action Box */}
            <div className="block lg:hidden pt-2">
              <ActionBox />
            </div>

            {/* Status Timeline */}
            <div className="pt-5 border-t border-[#E3ECE6] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A39B]">Recovery Status Tracking</h3>
              <StatusTimeline
                status={item.status}
                hasMatch={matches.length > 0}
                hasClaim={claims.length > 0 || !!userClaim}
              />
            </div>
          </div>

          {/* Multimodal AI Image Verification Card */}
          <MultimodalAnalysisBadge item={item} />

          {/* If Owner: Received Claims Inspection */}
          {isOwner && claims.length > 0 && (
            <div className="rounded-3xl bg-white border border-[#FDE68A] p-5 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D97706] shrink-0" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#102018]">Claims Received ({claims.length})</h3>
                  <p className="text-xs text-[#66756C] font-medium">Review and coordinate handover with claimants</p>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {claims.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={c.claimant_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.claimant_name}`}
                          alt={c.claimant_name}
                          className="w-10 h-10 rounded-xl object-cover bg-white border border-[#E3ECE6] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[#102018] truncate">{c.claimant_name}</div>
                          <div className="text-[11px] text-[#168A4A] font-semibold truncate">{c.claimant_campus}</div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                        c.status === 'APPROVED'
                          ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                          : c.status === 'RESOLVED'
                          ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                          : c.status === 'REJECTED'
                          ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]'
                          : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                      }`}>
                        {c.status === 'RESOLVED' ? 'RETURNED' : c.status}
                      </span>
                    </div>

                    {c.message ? (
                      <div className="bg-white p-3 rounded-xl border border-[#E3ECE6] text-[#2D3D34]">
                        <span className="font-bold text-[#66756C]">Note from claimant: </span>
                        <span>{c.message}</span>
                      </div>
                    ) : (
                      <div className="text-[#66756C] italic text-[11px]">
                        No additional note provided with claim request.
                      </div>
                    )}

                    {/* Pending Actions */}
                    {c.status === 'PENDING' && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-[#E3ECE6]">
                        <button
                          onClick={() => {
                            setContactTarget({
                              title: 'Contact Claimant',
                              role: 'Claimant',
                              contact: {
                                name: c.claimant_name,
                                campus: c.claimant_campus,
                                email: (c as any).claimant_email,
                                phone: (c as any).claimant_phone,
                                avatar: c.claimant_avatar
                              },
                              itemName: item.title
                            });
                            setContactModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#EEF8F1] text-[#102018] border border-[#E3ECE6] font-bold text-xs flex items-center justify-center gap-1.5 touch-target"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#35B86B]" />
                          <span>Contact</span>
                        </button>
                        <button
                          onClick={() => handleClaimStatusUpdate(c.id, 'REJECTED')}
                          className="px-4 py-2 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FFE4E6] font-bold text-xs touch-target text-center"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleClaimStatusUpdate(c.id, 'APPROVED')}
                          className="btn-primary px-5 py-2 text-xs flex items-center justify-center gap-1.5 touch-target text-center"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Claim</span>
                        </button>
                      </div>
                    )}

                    {/* Approved Actions: Ready for Handover */}
                    {c.status === 'APPROVED' && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-[#E3ECE6]">
                        <span className="text-[11px] font-bold text-[#168A4A] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#35B86B]" />
                          <span>Approved — Coordinate handover</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setContactTarget({
                                title: 'Contact Claimant',
                                role: 'Claimant',
                                contact: {
                                  name: c.claimant_name,
                                  campus: c.claimant_campus,
                                  email: (c as any).claimant_email,
                                  phone: (c as any).claimant_phone,
                                  avatar: c.claimant_avatar
                                },
                                itemName: item.title
                              });
                              setContactModalOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#EEF8F1] text-[#102018] border border-[#E3ECE6] font-bold text-xs flex items-center justify-center gap-1.5 touch-target"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#35B86B]" />
                            <span>Contact Claimant</span>
                          </button>
                          <button
                            onClick={() => handleResolveClaim(c.id)}
                            className="btn-primary px-4 py-2 text-xs flex items-center justify-center gap-1.5 touch-target"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Handed Over</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Resolved */}
                    {c.status === 'RESOLVED' && (
                      <div className="text-[11px] font-bold text-[#168A4A] flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#35B86B]" />
                        <span>Returned to claimant and verified resolved 🎉</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Desktop Action Box, Reporter Profile, AI Potential Matches */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          {/* Desktop Only Action Box */}
          <div className="hidden lg:block">
            <ActionBox />
          </div>

          {/* Privacy-Safe Reporter Meta Card */}
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-5 sm:p-6 space-y-3.5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A39B]">Reporter Profile</h3>
            <div className="flex items-center gap-3">
              <img
                src={item.reporter_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.reporter_name}`}
                alt={item.reporter_name}
                className="w-11 h-11 rounded-2xl object-cover border border-[#E3ECE6] bg-[#EEF8F1] shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#102018] truncate">{item.reporter_name}</div>
                <div className="text-xs text-[#168A4A] font-bold truncate">{item.reporter_campus}</div>
              </div>
            </div>
            <div className="text-[11px] text-[#66756C] bg-[#F7FBF8] p-3 rounded-xl border border-[#E3ECE6] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#35B86B] shrink-0" />
              <span>Contact details stay private until ownership claim is approved.</span>
            </div>
          </div>

          {/* AI Potential Matches List */}
          {matches.length > 0 && (
            <div className="rounded-3xl bg-white border border-[#E3ECE6] p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#35B86B]" />
                  <h3 className="text-sm font-bold text-[#102018]">AI Potential Matches ({matches.length})</h3>
                </div>
                <span className="text-[10px] font-bold text-[#168A4A] bg-[#EEF8F1] px-2.5 py-0.5 rounded-full border border-[#D5ECD9]">
                  Live
                </span>
              </div>

              <div className="space-y-4">
                {matches.map((m) => (
                  <AIMatchCard
                    key={m.match_id}
                    match={m}
                    originItemId={item.id}
                    onClaimClick={(claimItem) => {
                      setClaimTargetItem(claimItem);
                      setIsClaimModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {claimTargetItem && (
        <ClaimModal
          item={claimTargetItem}
          isOpen={isClaimModalOpen}
          onClose={() => {
            setIsClaimModalOpen(false);
            setClaimTargetItem(null);
          }}
          onSuccess={() => {
            setIsClaimModalOpen(false);
            setClaimTargetItem(null);
            loadItemDetails();
          }}
        />
      )}

      {/* Contact Modal */}
      {contactTarget && (
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => {
            setContactModalOpen(false);
            setContactTarget(null);
          }}
          title={contactTarget.title}
          role={contactTarget.role}
          contact={contactTarget.contact}
          itemName={contactTarget.itemName}
        />
      )}
    </div>
  );
}
