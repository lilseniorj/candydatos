import Skeleton, { SkeletonText } from '../ui/Skeleton'

export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="w-48 h-7" />
      {/* Funnel chart skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
        <Skeleton className="w-40 h-5 mb-4" />
        <div className="flex items-end gap-3 h-48">
          {[70, 50, 85, 40, 60, 30].map((h, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      {/* Radar chart skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
        <Skeleton className="w-52 h-5 mb-4" />
        <div className="flex items-center justify-center h-64">
          <Skeleton className="w-48 h-48" rounded="rounded-full" />
        </div>
      </div>
      {/* Interview list skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 space-y-3">
        <Skeleton className="w-44 h-5 mb-4" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <Skeleton className="w-12 h-12 shrink-0" rounded="rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-1/3 h-4" />
              <Skeleton className="w-1/2 h-3" />
            </div>
            <Skeleton className="w-16 h-6" rounded="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
