"use client"

import { useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { useParams } from "next/navigation"
import { Calendar, Clock, Radio } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useNow } from "@/hooks/use-now"
import { computeSemesterProgress } from "@/lib/semester-progress"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

type Semester = { _id: string; title: string; startDate: number; endDate: number; isActive: boolean } | null
type Activity = { _id: string; title: string; description?: string; date: number }

function ActivityRow({ activity, past }: { activity: Activity; past: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3.5">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${past ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}
      >
        <Radio className="size-4" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">{activity.title}</p>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {shortDateFormatter.format(new Date(activity.date))}
          </span>
        </div>
        {activity.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
        ) : null}
      </div>
    </div>
  )
}

export default function SemesterDetailPage() {
  const { semesterId } = useParams<{ semesterId: string }>()
  const semester = useQuery(anyApi.semesters.get, { semesterId }) as Semester | undefined
  const activities = useQuery(anyApi.alerts.listBySemester, { semesterId }) as Activity[] | undefined
  const now = useNow()

  if (semester === undefined || activities === undefined || now === null) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-40 w-full rounded-md" />
      </div>
    )
  }

  if (semester === null) {
    return <p className="text-sm text-muted-foreground">This semester couldn&apos;t be found.</p>
  }

  const progress = computeSemesterProgress(semester.startDate, semester.endDate, now)
  const upcoming = activities.filter((a) => a.date >= now).sort((a, b) => a.date - b.date)
  const past = activities.filter((a) => a.date < now).sort((a, b) => b.date - a.date)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{semester.title}</h1>
          {semester.isActive ? (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: "color-mix(in oklch, var(--chart-3) 15%, transparent)", color: "var(--chart-3)" }}
            >
              Active
            </span>
          ) : null}
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          {dateFormatter.format(new Date(semester.startDate))} – {dateFormatter.format(new Date(semester.endDate))}
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.percent}% through the semester</span>
            <span>{progress.label}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Upcoming ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing upcoming.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((activity) => (
                <ActivityRow key={activity._id} activity={activity} past={false} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Past ({past.length})</h2>
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {past.map((activity) => (
                <ActivityRow key={activity._id} activity={activity} past />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
