import React from 'react';
import { cn } from '@/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse bg-slate-800/80 rounded-md', className)}
      {...props}
    />
  );
};

export const MovieCardSkeleton: React.FC = () => {
  return (
    <div className="bg-cinema-card border border-cinema-border rounded-xl overflow-hidden p-3 space-y-3">
      <Skeleton className="w-full aspect-[2/3] rounded-lg" />
      <Skeleton className="h-5 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
};
