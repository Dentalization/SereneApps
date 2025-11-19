import React from 'react';

const ScheduleSkeleton = () => {
  return (
    <div className="p-8 space-y-8 dentist-skeleton">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-10 w-72 rounded-2xl bg-accent/20 animate-pulse"></div>
          <div className="h-5 w-96 rounded-xl bg-accent/10 animate-pulse"></div>
        </div>
        <div className="flex items-center gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`view-toggle-${index}`}
              className="h-10 w-24 rounded-xl bg-accent/10 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="bg-surface-elevated rounded-2xl border border-primary/10 p-6 shadow-theme-lg skeleton-surface">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-accent/10 animate-pulse"></div>
            <div className="h-10 rounded-xl bg-accent/20 animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-accent/10 animate-pulse"></div>
            <div className="h-10 rounded-xl bg-accent/10 animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-accent/10 animate-pulse"></div>
            <div className="h-10 rounded-xl bg-accent/10 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Calendar Placeholder */}
      <div className="bg-surface-elevated rounded-3xl border border-primary/10 p-6 shadow-theme-lg skeleton-surface">
        <div className="h-6 w-28 rounded bg-accent/10 animate-pulse mb-4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={`calendar-col-${index}`} className="space-y-2">
              <div className="h-4 w-full rounded bg-accent/10 animate-pulse"></div>
              <div className="h-32 rounded-2xl bg-accent/5 animate-pulse border border-primary/10"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Appointment cards placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`card-${index}`}
            className="rounded-2xl border border-primary/10 bg-surface-elevated p-4 shadow-theme-md skeleton-surface"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-28 rounded bg-accent/10 animate-pulse"></div>
                <div className="h-5 w-40 rounded bg-accent/20 animate-pulse"></div>
              </div>
              <div className="h-6 w-16 rounded-full bg-accent/10 animate-pulse"></div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 w-24 rounded bg-accent/10 animate-pulse"></div>
              <div className="h-4 w-3/4 rounded bg-accent/5 animate-pulse"></div>
              <div className="h-4 w-1/2 rounded bg-accent/5 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              {Array.from({ length: 3 }).map((_, chipIndex) => (
                <div
                  key={`chip-${chipIndex}`}
                  className="h-6 w-16 rounded-full bg-accent/10 animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleSkeleton;
