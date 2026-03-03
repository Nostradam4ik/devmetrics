import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <Skeleton className="h-4 w-1/3 mb-2" />
      <Skeleton className="h-8 w-1/2 mb-1" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className={`h-4 ${i === 0 ? 'w-32' : 'w-16'}`} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-end space-x-2 h-48">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              className="w-full rounded-t-sm"
              style={{ height: `${Math.random() * 120 + 20}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

export function InsightCardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6 mt-1" />
    </div>
  );
}
