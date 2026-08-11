import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-6 h-[120px]">
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/4" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-md border border-border bg-card p-4 h-[100px]">
             <Skeleton className="h-4 w-1/2 mb-4" />
             <Skeleton className="h-6 w-1/3" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-md border border-border bg-card p-6 h-[300px]">
             <Skeleton className="h-6 w-1/4 mb-4" />
             <Skeleton className="h-64 w-full" />
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-3 h-[300px]">
             <Skeleton className="h-5 w-1/3 mx-2.5 mt-1.5 mb-3" />
             <div className="space-y-1">
               <Skeleton className="h-14 w-full rounded-md" />
               <Skeleton className="h-14 w-full rounded-md" />
               <Skeleton className="h-14 w-full rounded-md" />
               <Skeleton className="h-14 w-full rounded-md" />
             </div>
        </div>
      </div>
    </div>
  )
}
