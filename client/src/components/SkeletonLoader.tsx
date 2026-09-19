import React from 'react';

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-[#E3ECE6] overflow-hidden p-5 space-y-3.5 shadow-sm">
      <div className="w-full aspect-[16/10] rounded-xl skeleton-shimmer-light"></div>
      <div className="h-4 w-2/3 rounded-md skeleton-shimmer-light"></div>
      <div className="h-3 w-full rounded-md skeleton-shimmer-light"></div>
      <div className="flex justify-between pt-2">
        <div className="h-3 w-1/3 rounded-md skeleton-shimmer-light"></div>
        <div className="h-3 w-1/4 rounded-md skeleton-shimmer-light"></div>
      </div>
      <div className="h-9 w-full rounded-xl skeleton-shimmer-light mt-2"></div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-8 w-1/3 rounded-xl skeleton-shimmer-light"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-[16/10] rounded-3xl skeleton-shimmer-light"></div>
          <div className="h-24 rounded-2xl skeleton-shimmer-light"></div>
        </div>
        <div className="space-y-6">
          <div className="h-64 rounded-3xl skeleton-shimmer-light"></div>
          <div className="h-48 rounded-3xl skeleton-shimmer-light"></div>
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-white border border-[#E3ECE6] space-y-2.5 shadow-sm">
          <div className="h-3 w-1/2 rounded skeleton-shimmer-light"></div>
          <div className="h-8 w-2/3 rounded skeleton-shimmer-light"></div>
        </div>
      ))}
    </div>
  );
}
