"use client"

import { useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { Calendar, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

type Semester = { _id: string; title: string; startDate: number; endDate: number; isActive: boolean }

export default function SemestersPage() {
  const { institutionId } = useParams<{ institutionId: string }>()
  const semesters = useQuery(anyApi.semesters.list) as Semester[] | undefined

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Every academic semester published for this institution — pick one to see its activities.
      </p>

      {semesters === undefined ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : semesters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
          <Calendar className="size-8 opacity-40" strokeWidth={1.5} />
          <p className="font-medium text-foreground">No semesters yet</p>
          <p className="text-sm">Published semesters will show up here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {semesters.map((semester) => (
            <Link
              key={semester._id}
              href={`/admin/${institutionId}/semesters/${semester._id}`}
              className="group flex items-center justify-between gap-4 rounded-md border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Calendar className="size-4" strokeWidth={2.25} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{semester.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateFormatter.format(new Date(semester.startDate))} –{" "}
                    {dateFormatter.format(new Date(semester.endDate))}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {semester.isActive ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: "color-mix(in oklch, var(--chart-3) 15%, transparent)", color: "var(--chart-3)" }}
                  >
                    Active
                  </span>
                ) : null}
                <ChevronRight className="size-4 text-muted-foreground/50" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
