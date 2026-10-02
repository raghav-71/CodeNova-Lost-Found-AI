import React, { useState } from 'react';
import { Mail, Phone, MapPin, Copy, Check, X, User } from 'lucide-react';
import { useToast } from '../context/ToastContext.js';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

export function ContactModal({
  isOpen,
  onClose,
  title,
  role,
  contact,
  itemName
}: ContactModalProps) {
  const { showToast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    if (!contact.email) return;
    navigator.clipboard.writeText(contact.email);
    setCopiedEmail(true);
    showToast({
      type: 'success',
      title: 'Email Copied',
      message: `${contact.email} copied to clipboard.`
    });
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    if (!contact.phone) return;
    navigator.clipboard.writeText(contact.phone);
    setCopiedPhone(true);
    showToast({
      type: 'success',
      title: 'Phone Copied',
      message: `${contact.phone} copied to clipboard.`
    });
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const mailtoSubject = encodeURIComponent(`FindIt AI: Regarding ${itemName || 'found item'}`);
  const mailtoBody = encodeURIComponent(
    `Hi ${contact.name || 'there'},\n\nI am contacting you through FindIt AI regarding "${itemName || 'the item'}".\n\nLet's coordinate the handover!\n\nBest,\n`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#102018]/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-[#E3ECE6] shadow-[0_24px_48px_-12px_rgba(22,138,74,0.18)] overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E3ECE6] flex items-center justify-between bg-[#F7FBF8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF8F1] border border-[#D5ECD9] flex items-center justify-center text-[#168A4A] shrink-0">
              <Mail className="w-5 h-5 text-[#35B86B]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#102018]">{title}</h3>
              <p className="text-xs text-[#66756C] font-medium">Coordinate recovery handover</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#66756C] hover:text-[#102018] hover:bg-[#EEF8F1] transition-colors shrink-0 touch-target flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* User Profile Card */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6]">
            <img
              src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.name || 'Campus'}`}
              alt={contact.name || role}
              className="w-12 h-12 rounded-xl object-cover border border-[#E3ECE6] bg-[#EEF8F1] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-[#168A4A] uppercase tracking-wider">{role}</span>
              <h4 className="text-sm font-extrabold text-[#102018] truncate">{contact.name || 'Campus Student'}</h4>
              {contact.campus && (
                <div className="flex items-center gap-1 text-[11px] text-[#66756C] truncate mt-0.5">
                  <MapPin className="w-3 h-3 text-[#35B86B] shrink-0" />
                  <span className="truncate">{contact.campus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Methods */}
          <div className="space-y-2.5">
            {contact.email ? (
              <div className="p-3.5 rounded-2xl bg-white border border-[#E3ECE6] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[#94A39B] uppercase">Campus Email</div>
                  <div className="text-xs sm:text-sm font-bold text-[#102018] truncate">{contact.email}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCopyEmail}
                    className="p-2 rounded-xl text-[#66756C] hover:text-[#102018] hover:bg-[#EEF8F1] transition-colors touch-target flex items-center justify-center border border-[#E3ECE6]"
                    title="Copy email"
                  >
                    {copiedEmail ? <Check className="w-4 h-4 text-[#35B86B]" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={`mailto:${contact.email}?subject=${mailtoSubject}&body=${mailtoBody}`}
                    className="btn-primary px-3 py-2 text-xs font-bold flex items-center gap-1.5 touch-target"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#F7FBF8] border border-[#E3ECE6] text-xs text-[#66756C] text-center font-medium">
                Email address not publicly shared. You can coordinate via campus security or reception.
              </div>
            )}

            {contact.phone && (
              <div className="p-3.5 rounded-2xl bg-white border border-[#E3ECE6] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[#94A39B] uppercase">Phone / WhatsApp</div>
                  <div className="text-xs sm:text-sm font-bold text-[#102018] truncate">{contact.phone}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCopyPhone}
                    className="p-2 rounded-xl text-[#66756C] hover:text-[#102018] hover:bg-[#EEF8F1] transition-colors touch-target flex items-center justify-center border border-[#E3ECE6]"
                    title="Copy phone"
                  >
                    {copiedPhone ? <Check className="w-4 h-4 text-[#35B86B]" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={`tel:${contact.phone}`}
                    className="px-3 py-2 rounded-xl bg-[#EEF8F1] hover:bg-[#D5ECD9] text-[#168A4A] border border-[#D5ECD9] text-xs font-bold flex items-center gap-1.5 touch-target"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#EEF8F1] border border-[#D5ECD9] text-[11px] text-[#2D3D34] leading-relaxed">
            <span className="font-bold text-[#168A4A]">Campus Handover Safety: </span>
            Arrange to meet at a busy, well-lit campus location such as the Library Desk, Student Union, or Campus Security.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E3ECE6] flex justify-end bg-[#F7FBF8]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#EEF8F1] text-[#102018] border border-[#E3ECE6] text-xs font-bold touch-target"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
