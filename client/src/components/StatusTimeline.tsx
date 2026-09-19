import React from 'react';
import { ItemStatus } from '../types/index.js';
import { Check } from 'lucide-react';

interface StatusTimelineProps {
  status: ItemStatus;
  hasMatch?: boolean;
  hasClaim?: boolean;
}

export function StatusTimeline({ status, hasMatch = false, hasClaim = false }: StatusTimelineProps) {
  const steps = [
    { key: 'reported', label: 'Reported', desc: 'Item published to directory' },
    { key: 'match', label: 'AI Match', desc: 'Similarities detected' },
    { key: 'claim', label: 'Claim Submitted', desc: 'Verification initiated' },
    { key: 'verification', label: 'Verification', desc: 'Proof inspected' },
    { key: 'resolved', label: 'Recovered', desc: 'Returned to owner 🎉' },
  ];

  let activeIndex = 0;
  if (status === 'RESOLVED') {
    activeIndex = 4;
  } else if (status === 'CLAIM_PENDING') {
    activeIndex = 3;
  } else if (hasClaim) {
    activeIndex = 2;
  } else if (status === 'MATCH_FOUND' || hasMatch) {
    activeIndex = 1;
  } else {
    activeIndex = 0;
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Background Track Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-[#E3ECE6] rounded-full"></div>
        {/* Progress Line */}
        <div 
          className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-[#35B86B] rounded-full transition-all duration-500"
          style={{ width: `${(activeIndex / (steps.length - 1)) * 90}%` }}
        ></div>

        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10 group">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm ${
                  isCompleted
                    ? 'bg-[#35B86B] text-white shadow-md shadow-[#35B86B]/25'
                    : isCurrent
                    ? 'bg-white text-[#168A4A] border-2 border-[#35B86B] ring-4 ring-[#EEF8F1] shadow-md shadow-[#35B86B]/20'
                    : 'bg-white text-[#94A39B] border border-[#E3ECE6]'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="hidden sm:block text-center mt-2.5">
                <div className={`text-xs font-bold ${isCurrent ? 'text-[#168A4A]' : isCompleted ? 'text-[#102018]' : 'text-[#66756C]'}`}>
                  {step.label}
                </div>
                <div className="text-[11px] text-[#66756C] max-w-[100px] truncate mt-0.5">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="sm:hidden text-center mt-3 bg-[#EEF8F1] py-1.5 px-3 rounded-xl border border-[#D5ECD9]">
        <span className="text-xs font-semibold text-[#66756C]">Current Step: </span>
        <span className="text-xs font-bold text-[#168A4A]">{steps[activeIndex].label}</span>
      </div>
    </div>
  );
}
