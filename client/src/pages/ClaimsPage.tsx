import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Claim } from '../types/index.js';
import { ContactModal } from '../components/ContactModal.js';
import confetti from 'canvas-confetti';
import { 
  FileText, 
  ShieldCheck, 
  ArrowUpRight, 
  Check, 
  Lock, 
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  MapPin,
  Tag,
  UserCheck
} from 'lucide-react';

export function ClaimsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'received' | 'submitted'>('received');
  const [receivedClaims, setReceivedClaims] = useState<Claim[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Contact Modal State
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

  useEffect(() => {
    loadClaims();
  }, [user]);

  const loadClaims = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [receivedRes, myRes] = await Promise.all([
        api.getReceivedClaims(),
        api.getMyClaims()
      ]);
      setReceivedClaims(receivedRes.claims || []);
      setMyClaims(myRes.claims || []);
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (claimId: string, newStatus: 'APPROVED' | 'REJECTED') => {
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
          message: 'Claim status updated.'
        });
      }
      loadClaims();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to update claim status.'
      });
    }
  };

  const handleResolveClaim = async (claimId: string) => {
    const confirm = window.confirm(
      'Confirm that this item has been returned? Both the claim and item will be marked as RESOLVED.'
    );
    if (!confirm) return;

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
        message: 'The item has been marked as resolved and closed.'
      });
      loadClaims();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Resolution Failed',
        message: err.message || 'Could not resolve claim.'
      });
    }
  };

  const handleCancelClaim = async (claimId: string) => {
    const confirm = window.confirm('Are you sure you want to cancel this claim?');
    if (!confirm) return;

    try {
      await api.cancelClaim(claimId);
      showToast({
        type: 'info',
        title: 'Claim Cancelled',
        message: 'Your claim request has been withdrawn.'
      });
      loadClaims();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Cancel Failed',
        message: err.message || 'Could not cancel claim.'
      });
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL.replace('/api', '')}${cleanUrl}`;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] flex items-center gap-1">
            <Check className="w-3 h-3 text-[#35B86B]" />
            <span>Approved</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#35B86B]" />
            <span>Returned</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6] flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] flex items-center gap-1">
            <span>Cancelled</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#D97706]" />
            <span>Pending Approval</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF8F1] border border-[#D5ECD9] text-[#168A4A] text-xs font-bold uppercase tracking-wide mb-2">
          <span>Campus Claims Hub</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
          Item Claims & Handover
        </h1>
        <p className="text-xs sm:text-sm text-[#66756C] mt-1 font-medium">
          Manage claims on items you found or track requests on items you've claimed
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#E3ECE6] pb-3">
        <button
          onClick={() => setActiveTab('received')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all touch-target ${
            activeTab === 'received'
              ? 'bg-[#35B86B] text-white shadow-md shadow-[#35B86B]/25'
              : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Claims Received ({receivedClaims.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all touch-target ${
            activeTab === 'submitted'
              ? 'bg-[#35B86B] text-white shadow-md shadow-[#35B86B]/25'
              : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Claims ({myClaims.length})</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#66756C]">Loading claims...</div>
      ) : activeTab === 'received' ? (
        receivedClaims.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-8 sm:p-12 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-base font-bold text-[#102018]">No claims received</h3>
            <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
              When a campus member claims an item you reported as found, it will appear here for review and handover.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {receivedClaims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-3xl bg-white border border-[#E3ECE6] p-4 sm:p-6 space-y-4 shadow-sm hover:border-[#D5ECD9] transition-all"
              >
                {/* Header: Item Preview & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E3ECE6]">
                  <Link
                    to={`/items/${claim.item_id}`}
                    className="flex items-center gap-3 group min-w-0"
                  >
                    <img
                      src={getImageUrl(claim.item_image)}
                      alt={claim.item_title}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#E3ECE6] bg-[#EEF8F1] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm sm:text-base text-[#102018] group-hover:text-[#168A4A] transition-colors truncate flex items-center gap-1">
                        <span>{claim.item_title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                      <div className="text-[11px] text-[#66756C] font-medium flex items-center gap-2 mt-0.5">
                        {claim.item_location && <span>{claim.item_location}</span>}
                        {claim.item_category && (
                          <>
                            <span>•</span>
                            <span>{claim.item_category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="self-start sm:self-auto shrink-0">
                    {renderStatusBadge(claim.status)}
                  </div>
                </div>

                {/* Claimant Details & Note */}
                <div className="bg-[#F7FBF8] p-3.5 sm:p-4 rounded-2xl border border-[#E3ECE6] space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={claim.claimant_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${claim.claimant_name}`}
                        alt={claim.claimant_name}
                        className="w-9 h-9 rounded-xl object-cover bg-white border border-[#E3ECE6] shrink-0"
                      />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-[#102018]">{claim.claimant_name}</div>
                        <div className="text-[10px] text-[#168A4A] font-semibold">{claim.claimant_campus}</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#94A39B] font-medium shrink-0 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>

                  {claim.message ? (
                    <div className="bg-white p-3 rounded-xl border border-[#E3ECE6] text-xs text-[#2D3D34]">
                      <span className="font-bold text-[#66756C]">Claimant Note: </span>
                      <span>{claim.message}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#94A39B] italic">
                      No additional note included with this claim request.
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                  {claim.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => {
                          setContactTarget({
                            title: 'Contact Claimant',
                            role: 'Claimant',
                            contact: {
                              name: claim.claimant_name,
                              campus: claim.claimant_campus,
                              email: (claim as any).claimant_email,
                              phone: (claim as any).claimant_phone,
                              avatar: claim.claimant_avatar
                            },
                            itemName: claim.item_title
                          });
                          setContactModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#EEF8F1] text-[#102018] border border-[#E3ECE6] text-xs font-bold flex items-center justify-center gap-1.5 touch-target"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#35B86B]" />
                        <span>Contact Claimant</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(claim.id, 'REJECTED')}
                        className="px-4 py-2 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FFE4E6] text-xs font-bold touch-target text-center"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(claim.id, 'APPROVED')}
                        className="btn-primary px-5 py-2 text-xs flex items-center justify-center gap-1.5 touch-target text-center"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Claim</span>
                      </button>
                    </>
                  )}

                  {claim.status === 'APPROVED' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-2">
                      <span className="text-[11px] font-bold text-[#168A4A] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#35B86B]" />
                        <span>Claim approved — Handover in progress</span>
                      </span>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setContactTarget({
                              title: 'Contact Claimant',
                              role: 'Claimant',
                              contact: {
                                name: claim.claimant_name,
                                campus: claim.claimant_campus,
                                email: (claim as any).claimant_email,
                                phone: (claim as any).claimant_phone,
                                avatar: claim.claimant_avatar
                              },
                              itemName: claim.item_title
                            });
                            setContactModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#EEF8F1] text-[#102018] border border-[#E3ECE6] text-xs font-bold flex items-center justify-center gap-1.5 touch-target"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#35B86B]" />
                          <span>Contact Claimant</span>
                        </button>
                        <button
                          onClick={() => handleResolveClaim(claim.id)}
                          className="btn-primary px-4 py-2 text-xs flex items-center justify-center gap-1.5 touch-target"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Handed Over</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {claim.status === 'RESOLVED' && (
                    <div className="text-xs font-bold text-[#168A4A] flex items-center gap-1 py-1">
                      <CheckCircle2 className="w-4 h-4 text-[#35B86B]" />
                      <span>Returned to claimant and verified resolved 🎉</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        myClaims.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-8 sm:p-12 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-base font-bold text-[#102018]">No submitted claims</h3>
            <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
              You haven't claimed any found items yet. Explore the campus directory or check your AI matches.
            </p>
            <Link to="/items" className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs">
              <span>Browse Found Items</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myClaims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-3xl bg-white border border-[#E3ECE6] p-4 sm:p-6 space-y-4 shadow-sm hover:border-[#D5ECD9] transition-all"
              >
                {/* Item Preview & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E3ECE6]">
                  <Link
                    to={`/items/${claim.item_id}`}
                    className="flex items-center gap-3 group min-w-0"
                  >
                    <img
                      src={getImageUrl(claim.item_image)}
                      alt={claim.item_title}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#E3ECE6] bg-[#EEF8F1] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm sm:text-base text-[#102018] group-hover:text-[#168A4A] transition-colors truncate flex items-center gap-1">
                        <span>{claim.item_title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </div>
                      <div className="text-[11px] text-[#66756C] font-medium flex items-center gap-2 mt-0.5">
                        {claim.item_location && <span>{claim.item_location}</span>}
                        {claim.item_category && (
                          <>
                            <span>•</span>
                            <span>{claim.item_category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="self-start sm:self-auto shrink-0">
                    {renderStatusBadge(claim.status)}
                  </div>
                </div>

                {/* Finder Details & Claimant Note */}
                <div className="bg-[#F7FBF8] p-3.5 sm:p-4 rounded-2xl border border-[#E3ECE6] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-[#66756C]">
                      <span className="font-semibold text-[#102018]">Finder: </span>
                      <span>{(claim as any).finder_name || claim.reporter_name || 'Campus Student'}</span>
                      {((claim as any).finder_campus || claim.reporter_campus) && (
                        <span className="text-[10px] text-[#168A4A] font-semibold ml-1.5">
                          ({(claim as any).finder_campus || claim.reporter_campus})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#94A39B]">
                      {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'Recent'}
                    </div>
                  </div>

                  {claim.message && (
                    <div className="bg-white p-2.5 rounded-xl border border-[#E3ECE6] text-xs text-[#2D3D34]">
                      <span className="font-bold text-[#66756C]">Your Note: </span>
                      <span>{claim.message}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                  {claim.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancelClaim(claim.id)}
                      className="px-4 py-2 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FFE4E6] text-xs font-bold touch-target text-center"
                    >
                      Cancel Claim
                    </button>
                  )}

                  {claim.status === 'APPROVED' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-2">
                      <span className="text-[11px] font-bold text-[#168A4A] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#35B86B]" />
                        <span>Claim approved! Contact the finder to collect your item.</span>
                      </span>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setContactTarget({
                              title: 'Contact Finder',
                              role: 'Finder',
                              contact: {
                                name: (claim as any).finder_name || claim.reporter_name,
                                campus: (claim as any).finder_campus || claim.reporter_campus,
                                email: (claim as any).finder_email || (claim as any).reporter_email,
                                phone: (claim as any).finder_phone || (claim as any).reporter_phone
                              },
                              itemName: claim.item_title
                            });
                            setContactModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#EEF8F1] text-[#102018] border border-[#E3ECE6] text-xs font-bold flex items-center justify-center gap-1.5 touch-target"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#35B86B]" />
                          <span>Contact Finder</span>
                        </button>
                        <button
                          onClick={() => handleResolveClaim(claim.id)}
                          className="btn-primary px-4 py-2 text-xs flex items-center justify-center gap-1.5 touch-target"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>I Received My Item</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {claim.status === 'RESOLVED' && (
                    <div className="text-xs font-bold text-[#168A4A] flex items-center gap-1 py-1">
                      <CheckCircle2 className="w-4 h-4 text-[#35B86B]" />
                      <span>Item received & verified resolved 🎉</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
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
