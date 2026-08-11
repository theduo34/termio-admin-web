import { Skeleton } from "@/components/ui/skeleton"

export default function HierarchyLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-3.5 w-72" />

      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((column) => (
          <div key={column} className="flex w-[272px] shrink-0 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center gap-2.5 border-b border-border p-3">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex flex-col gap-1.5 p-1.5">
              {[1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-11 w-full rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
