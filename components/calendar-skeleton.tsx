'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function CalendarDaySkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>

      {/* Slots skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CalendarMonthSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 gap-2">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
          <div key={i} className="text-center text-xs text-muted-foreground font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid with shimmer effect */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="aspect-square rounded-lg" 
            style={{ animationDelay: `${i * 20}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// Message skeleton with different types
export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn(
      "flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {!isOwn && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
      <div className={cn("space-y-2", isOwn ? "items-end" : "items-start")}>
        <Skeleton className={cn(
          "h-12 rounded-2xl",
          isOwn ? "w-40 rounded-br-md" : "w-48 rounded-bl-md"
        )} />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <MessageSkeleton isOwn={false} />
      <MessageSkeleton isOwn={true} />
      <MessageSkeleton isOwn={false} />
      <MessageSkeleton isOwn={true} />
      <MessageSkeleton isOwn={false} />
    </div>
  );
}

// Gallery skeleton
export function GalleryItemSkeleton() {
  return (
    <Skeleton className="aspect-square rounded-xl animate-pulse" />
  );
}

export function GallerySkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-2 animate-in fade-in duration-500">
      {Array.from({ length: count }).map((_, i) => (
        <GalleryItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Media upload skeleton
export function MediaUploadSkeleton() {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden animate-in fade-in duration-300">
      <Skeleton className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

// Week view skeleton
export function WeekViewSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Week navigation */}
      <div className="flex justify-between items-center px-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      
      {/* Days row */}
      <div className="flex gap-2 overflow-hidden px-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 min-w-[60px]">
            <Skeleton className="h-20 rounded-xl" style={{ animationDelay: `${i * 50}ms` }} />
          </div>
        ))}
      </div>
      
      {/* Timeline */}
      <div className="space-y-2 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-16 flex-1 rounded-lg" style={{ animationDelay: `${i * 30}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Game skeleton
export function GameSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 p-4 animate-in fade-in duration-500">
      {/* Header */}
      <Skeleton className="h-8 w-48" />
      
      {/* Canvas area */}
      <Skeleton className="w-full aspect-square max-w-md rounded-2xl" />
      
      {/* Controls */}
      <div className="flex gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      
      {/* Word hint */}
      <Skeleton className="h-6 w-32" />
    </div>
  );
}

// Generic pulse loader
export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <div 
          key={i}
          className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// Shimmer overlay for images
export function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  );
}
