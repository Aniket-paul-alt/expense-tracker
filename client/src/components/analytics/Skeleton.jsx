const Sk = ({ className = "" }) => (
  <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse ${className}`} />
);

export const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3 transition-colors">
    <Sk className="h-3 w-20" />
    <Sk className="h-6 w-28" />
    <Sk className="h-2 w-16" />
  </div>
);

export const ChartSkeleton = ({ height = 200 }) => (
  <Sk className="w-full rounded-xl" style={{ height }} />
);

export const ListSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array(rows).fill(0).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Sk className="w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Sk className="h-3 w-24" />
          <Sk className="h-2 w-full" />
        </div>
        <Sk className="h-3 w-14" />
      </div>
    ))}
  </div>
);

export default Sk;