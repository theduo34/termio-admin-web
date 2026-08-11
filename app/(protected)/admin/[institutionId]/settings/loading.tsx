import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-56" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}
