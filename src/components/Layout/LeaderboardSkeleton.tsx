import React from "react";
import { Skeleton } from "../ui/skeleton";
import Header from "./Header";

const LeaderboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Filter Skeleton */}
          <aside className="w-full md:w-72 border-r md:pr-4">
            <Skeleton className="h-6 w-16 mb-4" />
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-12 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </aside>

          {/* Right: Leaderboard Skeletons */}
          <section className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Top Locations Skeleton */}
              <div className="w-full shadow-md rounded-lg overflow-hidden bg-card">
                <div className="pb-2 p-6">
                  <Skeleton className="h-6 w-24 mx-auto" />
                </div>
                <div className="px-0">
                  <div className="grid grid-cols-3 text-xs font-medium border-b px-4 py-2 bg-muted">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12 mx-auto" />
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                  <div>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 items-center px-4 py-2 border-b last:border-0"
                      >
                        <div className="flex flex-col min-w-0 space-y-1">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-8 mx-auto" />
                        <Skeleton className="h-6 w-6 rounded-full mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Brands Skeleton */}
              <div className="w-full shadow-md rounded-lg overflow-hidden bg-card">
                <div className="pb-2 p-6">
                  <Skeleton className="h-6 w-20 mx-auto" />
                </div>
                <div className="px-0">
                  <div className="grid grid-cols-3 text-xs font-medium border-b px-4 py-2 bg-muted">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12 mx-auto" />
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                  <div>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 items-center px-4 py-2 border-b last:border-0"
                      >
                        <div className="flex flex-col min-w-0 space-y-1">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-8 mx-auto" />
                        <Skeleton className="h-6 w-6 rounded-full mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Users Skeleton */}
              <div className="w-full shadow-md rounded-lg overflow-hidden bg-card">
                <div className="pb-2 p-6">
                  <Skeleton className="h-6 w-16 mx-auto" />
                </div>
                <div className="px-0">
                  <div className="grid grid-cols-3 text-xs font-medium border-b px-4 py-2 bg-muted">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12 mx-auto" />
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                  <div>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 items-center px-4 py-2 border-b last:border-0"
                      >
                        <div className="flex flex-col min-w-0 space-y-1">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-8 mx-auto" />
                        <Skeleton className="h-6 w-6 rounded-full mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default LeaderboardSkeleton;