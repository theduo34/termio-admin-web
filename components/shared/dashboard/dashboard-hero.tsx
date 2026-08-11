"use client"

import Link from "next/link"
import { Building2, Calendar, ChevronRight } from "lucide-react"

import { useNow } from "@/hooks/use-now"
import { computeSemesterProgress } from "@/lib/semester-progress"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })

type Semester = { title: string; startDate: number; endDate: number } | null

export function DashboardHero({
  institutionName,
  activeSemester,
  href,
}: {
  institutionName: string
  activeSemester: Semester
  /** Present only when there's an active semester to link to — see DashboardPage. */
  href?: string
}) {
  const now = useNow()

  const progress =
    activeSemester && now !== null
      ? computeSemesterProgress(activeSemester.startDate, activeSemester.endDate, now)
      : null

  const content = (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-6 transition-colors group-hover:border-primary/40">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{activeSemester?.title ?? "No active semester"}</h1>
            {activeSemester ? (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: "color-mix(in oklch, var(--chart-3) 15%, transparent)", color: "var(--chart-3)" }}
              >
                Active
              </span>
            ) : null}
          </div>
          {href ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
              View details
              <ChevronRight className="size-4" />
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Building2 className="size-4" />
            {institutionName}
          </span>
          {activeSemester ? (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {dateFormatter.format(new Date(activeSemester.startDate))} –{" "}
              {dateFormatter.format(new Date(activeSemester.endDate))}
            </span>
          ) : null}
        </div>
      </div>

      {progress ? (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.percent}% through the semester</span>
            <span>{progress.label}</span>
          </div>
        </div>
      ) : null}
    </div>
  )

  return href ? (
    <Link href={href} className="group block">
      {content}
    </Link>
  ) : (
    content
  )
}
