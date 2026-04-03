import Skeleton, { SkeletonText, SkeletonCircle } from '../ui/Skeleton'

export default function JobBoardSkeleton() {
  return (
    <div className="h-full flex flex-col -m-4 md:-m-6" aria-hidden="true">
      {/* Top bar skeleton */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-32 h-10 hidden sm:block" />
        </div>
      </div>
      <div className="px-4 md:px-6 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <Skeleton className="w-24 h-3" />
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 shrink-0" rounded="rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-1/2 h-3" />
                <Skeleton className="w-2/3 h-3" />
              </div>
            </div>
          ))}
        </div>
        {/* Right panel */}
        <div className="hidden md:block flex-1 p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 shrink-0" rounded="rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-2/3 h-6" />
              <Skeleton className="w-1/3 h-4" />
              <Skeleton className="w-1/4 h-3" />
            </div>
          </div>
          <SkeletonText lines={5} />
        </div>
      </div>
    </div>
  )
}
