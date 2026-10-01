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
  Inbox,
  Clock,
  CheckCircle2,
  XCircle
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
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF8F1] border border-[#D5ECD9] text-[#168A4A] text-xs font-bold uppercase tracking-wide mb-2">
          <span>Verification & Claims Hub</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-extrabold text-[#102018] tracking-tight">
          Campus Ownership Claims
        </h1>
        <p className="text-xs sm:text-sm text-[#66756C] mt-1 font-medium">
          Review ownership verification requests or track claims you submitted on found campus items
        </p>
      </div>

      {/* Tabs (Mobile-friendly horizontal scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#E3ECE6] pb-3">
        <button
          onClick={() => setActiveTab('received')}
          className={`shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all touch-target ${
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
          className={`shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all touch-target ${
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
            <h3 className="text-base font-bold text-[#102018]">No verification claims received</h3>
            <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
              Whenever a student files an ownership claim on items you reported, their verification questionnaire will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {receivedClaims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-3xl bg-white border border-[#E3ECE6] p-4 sm:p-6 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E3ECE6]">
                  <div className="flex items-center gap-3">
                    <img
                      src={claim.claimant_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${claim.claimant_name}`}
                      alt={claim.claimant_name}
                      className="w-10 h-10 rounded-xl object-cover border border-[#E3ECE6] bg-[#EEF8F1] shrink-0"
                    />
                    <div>
                      <div className="font-bold text-sm text-[#102018]">{claim.claimant_name}</div>
                      <div className="text-[11px] text-[#168A4A] font-semibold">{claim.claimant_campus}</div>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                    claim.status === 'APPROVED'
                      ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                      : claim.status === 'REJECTED'
                      ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]'
                      : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                  }`}>
                    {claim.status}
                  </span>
                </div>

                {/* Claim details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F7FBF8] p-3.5 sm:p-4 rounded-2xl border border-[#E3ECE6]">
                  <div>
                    <span className="font-bold text-[#66756C]">Where Lost: </span>
                    <span className="text-[#102018] font-medium break-words-anywhere">{claim.location_lost}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#66756C]">Date Lost: </span>
                    <span className="text-[#102018] font-medium">{claim.date_lost}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-bold text-[#66756C]">Identifying Details: </span>
                    <span className="text-[#102018] font-medium break-words-anywhere">{claim.identifying_details}</span>
                  </div>
                  {claim.proof_notes && (
                    <div className="sm:col-span-2">
                      <span className="font-bold text-[#66756C]">Proof Notes: </span>
                      <span className="text-[#102018] font-medium break-words-anywhere">{claim.proof_notes}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons if Pending */}
                {claim.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleUpdateStatus(claim.id, 'REJECTED')}
                      className="px-4 py-2.5 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FFE4E6] text-xs font-bold touch-target text-center"
                    >
                      Reject Claim
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(claim.id, 'APPROVED')}
                      className="btn-primary px-5 py-2.5 text-xs flex items-center justify-center gap-1.5 touch-target text-center"
                    >
                      <Check className="w-3.5 h-3.5" />
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
          <div className="rounded-3xl bg-white border border-[#E3ECE6] p-8 sm:p-12 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center mx-auto text-[#168A4A]">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-base font-bold text-[#102018]">No submitted claims</h3>
            <p className="text-xs text-[#66756C] max-w-sm mx-auto font-medium">
              You haven't filed any ownership claims on campus items yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myClaims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-3xl bg-white border border-[#E3ECE6] p-4 sm:p-6 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#94A39B] uppercase">Submitted Claim</span>
                    <h3 className="text-sm font-bold text-[#102018] mt-0.5">{claim.identifying_details}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    claim.status === 'APPROVED'
                      ? 'bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]'
                      : claim.status === 'REJECTED'
                      ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]'
                      : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                  }`}>
                    {claim.status}
                  </span>
                </div>

                <div className="text-xs text-[#66756C]">
                  Lost around <span className="font-semibold text-[#102018]">{claim.location_lost}</span> on <span className="font-semibold text-[#102018]">{claim.date_lost}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
