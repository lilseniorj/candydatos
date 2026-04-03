import Skeleton, { SkeletonCircle } from '../ui/Skeleton'

export default function ApplicationsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4" aria-hidden="true">
      <Skeleton className="w-48 h-7" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 shrink-0" rounded="rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-1/2 h-4" />
              <Skeleton className="w-1/3 h-3" />
              {/* Pipeline mini */}
              <div className="flex gap-1">
                {Array.from({ length: 6 }, (_, j) => (
                  <Skeleton key={j} className="w-6 h-6" rounded="rounded-full" />
                ))}
              </div>
            </div>
            <Skeleton className="w-11 h-11 shrink-0" rounded="rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
