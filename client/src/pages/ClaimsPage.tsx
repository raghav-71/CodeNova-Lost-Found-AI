import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Claim } from '../types/index.js';
import confetti from 'canvas-confetti';
import { 
  FileText, 
  ShieldCheck, 
  ArrowUpRight, 
  Check, 
  Lock, 
  Inbox
} from 'lucide-react';

export function ClaimsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'received' | 'submitted'>('received');
  const [receivedClaims, setReceivedClaims] = useState<Claim[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        showToast({
          type: 'success',
          title: 'Claim Approved! 🎉',
          message: 'Item has been verified and marked as RESOLVED. Coordinates shared with claimant.'
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

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL.replace('/api', '')}${cleanUrl}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF8F1] border border-[#D5ECD9] text-[#168A4A] text-xs font-bold uppercase tracking-wide mb-2">
          <span>Verification & Claims Hub</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
          Campus Ownership Claims
        </h1>
        <p className="text-xs sm:text-sm text-[#66756C] mt-1 font-medium">
          Review ownership verification requests or track claims you submitted on found campus items
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E3ECE6] pb-4">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'received'
              ? 'bg-[#35B86B] text-white shadow-md shadow-[#35B86B]/25'
              : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Claims Received on My Items ({receivedClaims.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'submitted'
              ? 'bg-[#35B86B] text-white shadow-md shadow-[#35B86B]/25'
              : 'text-[#66756C] hover:text-[#102018] bg-white border border-[#E3ECE6]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Claims I Submitted ({myClaims.length})</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#66756C]">Loading claims...</div>
      ) : activeTab === 'received' ? (
        receivedClaims.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-12 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#102018]">No claims received yet</h3>
            <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
              When other campus members believe an item you found belongs to them, their verification details will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {receivedClaims.map((c) => (
              <div
                key={c.id}
                className="rounded-3xl bg-white border border-[#E3ECE6] p-6 sm:p-8 shadow-[0_10px_28px_-4px_rgba(22,138,74,0.06)] space-y-5"
              >
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3ECE6]">
                  <div className="flex items-center gap-4">
                    <img
                      src={getImageUrl(c.item_image)}
                      alt={c.item_title}
                      className="w-14 h-14 rounded-2xl object-cover bg-[#EEF8F1] border border-[#E3ECE6] shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-bold text-[#94A39B] uppercase">Item Claimed:</span>
                      <h3 className="text-base font-bold text-[#102018]">{c.item_title}</h3>
                      <Link
                        to={`/items/${c.item_id}`}
                        className="text-xs font-bold text-[#168A4A] hover:text-[#116B3A] flex items-center gap-1 mt-0.5"
                      >
                        <span>View Item Record</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center ${
                    c.status === 'APPROVED'
                      ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                      : c.status === 'REJECTED'
                      ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]'
                      : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                  }`}>
                    {c.status}
                  </span>
                </div>

                {/* Claimant Details */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6]">
                  <img
                    src={c.claimant_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.claimant_name}`}
                    alt={c.claimant_name}
                    className="w-10 h-10 rounded-xl object-cover border border-[#E3ECE6]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#102018]">{c.claimant_name}</div>
                    <div className="text-[11px] text-[#168A4A] font-semibold">{c.claimant_campus}</div>
                  </div>
                </div>

                {/* Verification Responses */}
                <div className="p-4 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] space-y-3 text-xs">
                  <div className="font-bold text-[#102018] text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#35B86B]" />
                    <span>Claimant Verification Questionnaire Answers:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="font-bold text-[#94A39B] block text-[11px]">Where Lost:</span>
                      <span className="text-[#102018] font-medium">{c.location_lost}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[#94A39B] block text-[11px]">Date Lost:</span>
                      <span className="text-[#102018] font-medium">{c.date_lost}</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-[#94A39B] block text-[11px]">Identifying Details:</span>
                    <p className="text-[#2D3D34] mt-0.5 leading-relaxed font-medium">{c.identifying_details}</p>
                  </div>

                  {c.proof_notes && (
                    <div>
                      <span className="font-bold text-[#94A39B] block text-[11px]">Proof / Notes:</span>
                      <p className="text-[#2D3D34] mt-0.5 leading-relaxed font-medium">{c.proof_notes}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {c.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleUpdateStatus(c.id, 'REJECTED')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FFE4E6]"
                    >
                      Reject Claim
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(c.id, 'APPROVED')}
                      className="btn-primary px-5 py-2 text-xs flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Claim & Resolve Item</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        myClaims.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-12 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#102018]">No claims submitted</h3>
            <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
              If you discover an item in the directory that matches your lost property, submit a claim to initiate verification.
            </p>
            <Link
              to="/items"
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
            >
              <span>Browse Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myClaims.map((c) => (
              <div
                key={c.id}
                className="rounded-3xl bg-white border border-[#E3ECE6] p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={getImageUrl(c.item_image)}
                      alt={c.item_title}
                      className="w-14 h-14 rounded-2xl object-cover bg-[#EEF8F1] border border-[#E3ECE6] shrink-0"
                    />
                    <div>
                      <h3 className="text-base font-bold text-[#102018]">{c.item_title}</h3>
                      <div className="text-xs text-[#66756C] flex items-center gap-2 mt-0.5 font-medium">
                        <span>Reported by {c.reporter_name}</span>
                        <span>•</span>
                        <span>{c.item_location}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center ${
                    c.status === 'APPROVED'
                      ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                      : c.status === 'REJECTED'
                      ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]'
                      : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6] text-xs space-y-1 font-medium">
                  <div>
                    <span className="font-bold text-[#66756C]">My Stated Location: </span>
                    <span className="text-[#102018]">{c.location_lost}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#66756C]">Distinguishing Features Provided: </span>
                    <span className="text-[#102018]">{c.identifying_details}</span>
                  </div>
                  {c.resolution_notes && (
                    <div className="pt-2 border-t border-[#E3ECE6] text-[#168A4A]">
                      <span className="font-bold">Finder Resolution Note: </span>
                      <span>{c.resolution_notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Link
                    to={`/items/${c.item_id}`}
                    className="text-xs font-bold text-[#168A4A] hover:text-[#116B3A] flex items-center gap-1"
                  >
                    <span>View Item Record</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
