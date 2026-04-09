import { Skeleton } from "@/components/ui/skeleton";

export default function MetricsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-6 border border-white/10">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-6 border border-white/10">
            <Skeleton className="h-6 w-40 mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-lg p-6 border border-white/10">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
