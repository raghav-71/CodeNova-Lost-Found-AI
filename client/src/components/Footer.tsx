import React from 'react';
import { Sparkles, ShieldCheck, Search, PlusCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E3ECE6] pt-12 pb-8 text-[#66756C] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-[#E3ECE6]">
          {/* Brand Column */}
          <div className="space-y-3.5 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#35B86B]/30 shadow-sm bg-white shrink-0">
                <img src="/logo.png" alt="FindIt AI Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-black text-[#102018] tracking-tight">
                FindIt<span className="text-[#35B86B]">AI</span>
              </span>
            </div>
            <p className="text-xs font-bold text-[#168A4A]">
              "Lost something? Let's find it."
            </p>
            <p className="text-[#66756C] leading-relaxed text-xs">
              AI-powered campus Lost & Found. Describe what you lost or found in natural language, and FindIt AI discovers relevant potential matches.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#168A4A] bg-[#EEF8F1] border border-[#D5ECD9] px-2.5 py-1 rounded-full w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-[#35B86B]" />
              <span>Verified Claims • Zero Automated Ownership</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#102018]">FindIt Platform</div>
            <ul className="space-y-2 font-medium">
              <li><Link to="/items" className="hover:text-[#168A4A] transition-colors">Find Items</Link></li>
              <li><Link to="/report/lost" className="hover:text-[#168A4A] transition-colors">Report Lost Item</Link></li>
              <li><Link to="/report/found" className="hover:text-[#168A4A] transition-colors">Report Found Item</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#168A4A] transition-colors">Student Dashboard</Link></li>
            </ul>
          </div>

          {/* AI Safety Standards */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#102018]">AI Safety & Principles</div>
            <ul className="space-y-2 text-[#66756C] font-medium">
              <li>• Natural language understanding & semantic search</li>
              <li>• Potential match similarity recommendations only</li>
              <li>• Final ownership verified by human claim review</li>
              <li>• Private contact details kept secure</li>
            </ul>
          </div>

          {/* Campus Assistance */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#102018]">Campus Support</div>
            <p className="text-[#66756C] leading-relaxed">
              Need assistance with a high-value item? Visit Campus Safety or the Student Union Help Desk.
            </p>
            <div className="text-[11px] text-[#66756C] font-semibold mt-1">
              Active 24/7 across all campus facilities & residential halls.
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#66756C]">
          <div>
            © {new Date().getFullYear()} FindIt AI. All rights reserved.
          </div>
          <div className="flex items-center gap-4 font-medium">
            <span>"Lost something? Let's find it."</span>
            <span className="text-[#D1E4D7]">•</span>
            <span className="flex items-center gap-1 text-[#168A4A]">
              Powered by FindIt AI & Google Gemini
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
