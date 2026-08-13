import { Skeleton } from "@/components/ui/skeleton"

export default function CoursesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-64 w-full rounded-md" />
    </div>
  )
}
