import Skeleton, { SkeletonCircle } from '../ui/Skeleton'

export default function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6" aria-hidden="true">
      {/* Profile header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <Skeleton className="h-24 w-full" rounded="rounded-none" />
        <div className="px-6 pb-5 -mt-12">
          <Skeleton className="w-24 h-24 border-4 border-white dark:border-gray-800" rounded="rounded-full" />
          <div className="mt-3 space-y-2">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-64 h-4" />
          </div>
          <Skeleton className="w-24 h-8 mt-4" />
        </div>
      </div>
      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-32 h-4" />
          </div>
        ))}
      </div>
      {/* Resume link */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10" rounded="rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
