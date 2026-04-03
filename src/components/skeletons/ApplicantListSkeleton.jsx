import Skeleton, { SkeletonCircle } from '../ui/Skeleton'

export default function ApplicantListSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="w-24 h-4" />
      {/* Job info card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="w-2/3 h-6" />
            <Skeleton className="w-1/2 h-4" />
          </div>
          <div className="text-center">
            <Skeleton className="w-12 h-10 mx-auto" />
            <Skeleton className="w-16 h-3 mt-1" />
          </div>
        </div>
      </div>
      {/* Pipeline summary */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-20" rounded="rounded-xl" />
        ))}
      </div>
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-40 h-10" />
      </div>
      {/* Applicant cards */}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <SkeletonCircle />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-1/3 h-4" />
              <Skeleton className="w-1/2 h-3" />
            </div>
            <Skeleton className="w-11 h-11 shrink-0" rounded="rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
