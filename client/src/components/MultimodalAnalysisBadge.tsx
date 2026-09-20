import React from 'react';
import { Sparkles, Eye, ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, Tag, Layers } from 'lucide-react';
import { Item, AIImageAnalysis } from '../types/index.js';

interface MultimodalAnalysisBadgeProps {
  item: Item;
}

export function MultimodalAnalysisBadge({ item }: MultimodalAnalysisBadgeProps) {
  const analysis: AIImageAnalysis | undefined = item.ai_image_analysis;
  const consistency = item.ai_text_image_consistency;

  if (!analysis && !consistency) {
    return null;
  }

  const isMajor = consistency === 'MAJOR_MISMATCH';
  const isMinor = consistency === 'MINOR_MISMATCH';
  const isConsistent = consistency === 'CONSISTENT';

  return (
    <div className="rounded-3xl bg-white border border-[#E3ECE6] p-6 space-y-4 shadow-[0_10px_28px_-4px_rgba(22,138,74,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]">
            <Eye className="w-4 h-4 text-[#35B86B]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A39B]">
              Multimodal AI Verification
            </h3>
            <div className="text-xs font-extrabold text-[#102018]">
              Image + Text Cross-Validation
            </div>
          </div>
        </div>

        {/* Verification Status Pill */}
        {isMajor ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Possible Mismatch</span>
          </span>
        ) : isMinor ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Minor Discrepancy</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#35B86B]" />
            <span>Photo Verified</span>
          </span>
        )}
      </div>

      {/* Discrepancy Alert Banner if Mismatch */}
      {isMajor && (
        <div className="p-3.5 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] text-xs text-[#E11D48] space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            <span>AI Detected Possible Item Type Difference</span>
          </div>
          <p className="text-[11px] text-[#E11D48]/90 leading-relaxed font-medium">
            Written description mentions <span className="font-bold underline">{item.category}</span>, while the photo appears to show a <span className="font-bold underline">{analysis?.object_type || item.ai_object_type || 'different object'}</span>.
          </p>
        </div>
      )}

      {isMinor && (
        <div className="p-3.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Attribute Variance Noted</span>
          </div>
          <p className="text-[11px] text-[#92400E]/90 leading-relaxed font-medium">
            AI detected minor differences in brand or color between user notes and photograph.
          </p>
        </div>
      )}

      {/* Structured AI Visual Observations Grid */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6]">
            <span className="text-[10px] font-bold uppercase text-[#94A39B] block">Observed Object</span>
            <span className="font-bold text-[#102018] capitalize">
              {analysis.object_type || item.ai_object_type || 'Unknown'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6]">
            <span className="text-[10px] font-bold uppercase text-[#94A39B] block">Detected Brand</span>
            <span className="font-bold text-[#102018]">
              {analysis.brand || item.ai_brand || 'Not visible'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6]">
            <span className="text-[10px] font-bold uppercase text-[#94A39B] block">Visible Color</span>
            <span className="font-bold text-[#102018] capitalize">
              {analysis.color || item.ai_color || 'Neutral'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7FBF8] border border-[#E3ECE6]">
            <span className="text-[10px] font-bold uppercase text-[#94A39B] block">AI Confidence</span>
            <span className="font-bold text-[#168A4A]">
              {Math.round((analysis.confidence || item.ai_image_confidence || 0.9) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Visible Damage or Distinctive Traits from Vision AI */}
      {analysis && (analysis.visible_features?.length > 0 || analysis.visible_damage?.length > 0) && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-[#66756C] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#35B86B]" />
            <span>AI Detected Physical Signatures & Damage:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.visible_features?.map((f, i) => (
              <span key={`f-${i}`} className="px-2.5 py-1 rounded-lg bg-[#EEF8F1] text-[#168A4A] border border-[#D5ECD9] text-[11px] font-semibold">
                {f}
              </span>
            ))}
            {analysis.visible_damage?.map((d, i) => (
              <span key={`d-${i}`} className="px-2.5 py-1 rounded-lg bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6] text-[11px] font-semibold">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-[#E3ECE6] flex items-center justify-between text-[10px] text-[#94A39B] font-medium">
        <span>Model: {analysis?.analysis_model || item.ai_analysis_version || 'Gemini Vision v2'}</span>
        <span>Human ownership claims remain final authority</span>
      </div>
    </div>
  );
}
