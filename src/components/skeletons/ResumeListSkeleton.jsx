import Skeleton from '../ui/Skeleton'

export default function ResumeListSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="w-40 h-7" />
        <Skeleton className="w-28 h-9" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="w-2/3 h-5" />
              <Skeleton className="w-1/3 h-3" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="w-16 h-5" rounded="rounded-full" />
                <Skeleton className="w-16 h-5" rounded="rounded-full" />
                <Skeleton className="w-16 h-5" rounded="rounded-full" />
              </div>
            </div>
            <Skeleton className="w-12 h-12 shrink-0" rounded="rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
