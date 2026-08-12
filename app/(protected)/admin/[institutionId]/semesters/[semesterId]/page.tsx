"use client"

import { useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { useParams } from "next/navigation"
import { Calendar, Clock, FileQuestion, Radio } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { useNow } from "@/hooks/use-now"
import { useCursorPage } from "@/hooks/use-cursor-page"
import { computeSemesterProgress } from "@/lib/semester-progress"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
const PAGE_SIZE = 10

type Semester = {
  _id: string
  title: string
  startDate: number
  endDate: number
  isActive: boolean
  activeMode?: "auto" | "manual"
  academicYearId?: string
} | null
type Category = { _id: string; name: string; kind?: "general" | "exams" }
type GeneralActivity = { _id: string; title: string; description?: string; date: number }
type ExamActivity = { _id: string; title: string; dueDate: number; notes?: string }

// Same week-granularity the progress bar's "N weeks remaining" label already uses
// (see lib/semester-progress.ts) — a date before the semester starts or after it ends
// clamps to week 1 / the last week rather than producing a negative or out-of-range
// number, since a handful of activities (registration, orientation) can legitimately
// fall just outside the semester's own date bounds.
function weekNumberFor(date: number, startDate: number, totalWeeks: number) {
  const week = Math.floor((date - startDate) / MS_PER_WEEK) + 1
  return Math.min(Math.max(week, 1), totalWeeks)
}

function groupByWeek<T>(items: T[], getDate: (item: T) => number, startDate: number, totalWeeks: number) {
  const groups: { week: number; items: T[] }[] = []
  for (const item of items) {
    const week = weekNumberFor(getDate(item), startDate, totalWeeks)
    const last = groups[groups.length - 1]
    if (last && last.week === week) {
      last.items.push(item)
    } else {
      groups.push({ week, items: [item] })
    }
  }
  return groups
}

// Read-only — editing/deleting an activity happens on its own category's Publish
// page (or the Uncategorized page for anything still unassigned), never here. This
// page is a whole-semester overview, not another place to manage the same rows.
function RowShell({ icon: Icon, title, subtitle, date, now }: { icon: typeof Radio; title: string; subtitle?: string; date: number; now: number }) {
  const isPast = date < now
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3.5">
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", isPast ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
        <Icon className="size-4" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", isPast ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
              {isPast ? "Past" : "Upcoming"}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {shortDateFormatter.format(new Date(date))}
            </span>
          </div>
        </div>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function PagerFooter({ hasPrev, hasNext, page, onPrev, onNext }: { hasPrev: boolean; hasNext: boolean; page: number; onPrev: () => void; onNext: () => void }) {
  if (page === 1 && !hasNext) return null
  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      <Button size="sm" variant="outline" disabled={!hasPrev} onClick={onPrev}>
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <Button size="sm" variant="outline" disabled={!hasNext} onClick={onNext}>
        Next
      </Button>
    </div>
  )
}

// One section per real category (labeled by its own name, never a made-up bucket
// name) plus, when there's anything, one "Uncategorized" section — categoryId
// omitted means "uncategorized" (see semesterActivities.ts
// #listUncategorizedBySemesterPaginated).
function GeneralSection({ label, categoryId, semester, now }: { label: string; categoryId?: string; semester: NonNullable<Semester>; now: number }) {
  const queryRef = categoryId
    ? anyApi.semesterActivities.listActivitiesByCategoryPaginated
    : anyApi.semesterActivities.listUncategorizedBySemesterPaginated
  const args = categoryId ? { categoryId } : { semesterId: semester._id }
  const { items, isLoading, hasNext, hasPrev, page, nextPage, prevPage } = useCursorPage<GeneralActivity>(queryRef, args, PAGE_SIZE)

  const totalWeeks = Math.max(1, Math.ceil((semester.endDate - semester.startDate) / MS_PER_WEEK))
  const groups = items ? groupByWeek(items, (a) => a.date, semester.startDate, totalWeeks) : []

  if (!isLoading && items && items.length === 0 && page === 1) return null

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</h3>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={`${group.week}-${group.items[0]?._id}`} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Week {group.week} of {totalWeeks}
              </p>
              <div className="flex flex-col gap-2">
                {group.items.map((activity) => (
                  <RowShell key={activity._id} icon={Radio} title={activity.title} subtitle={activity.description} date={activity.date} now={now} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <PagerFooter hasPrev={hasPrev} hasNext={hasNext} page={page} onPrev={prevPage} onNext={nextPage} />
    </div>
  )
}

function ExamsSection({ label, categoryId, semester, now }: { label: string; categoryId?: string; semester: NonNullable<Semester>; now: number }) {
  const queryRef = categoryId
    ? anyApi.courseActivities.listExamsByCategoryPaginated
    : anyApi.courseActivities.listUncategorizedExamsBySemesterPaginated
  const args = categoryId ? { categoryId } : { semesterId: semester._id }
  const { items, isLoading, hasNext, hasPrev, page, nextPage, prevPage } = useCursorPage<ExamActivity>(queryRef, args, PAGE_SIZE)

  const totalWeeks = Math.max(1, Math.ceil((semester.endDate - semester.startDate) / MS_PER_WEEK))
  const groups = items ? groupByWeek(items, (e) => e.dueDate, semester.startDate, totalWeeks) : []

  if (!isLoading && items && items.length === 0 && page === 1) return null

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</h3>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={`${group.week}-${group.items[0]?._id}`} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Week {group.week} of {totalWeeks}
              </p>
              <div className="flex flex-col gap-2">
                {group.items.map((exam) => (
                  <RowShell key={exam._id} icon={FileQuestion} title={exam.title} subtitle={exam.notes} date={exam.dueDate} now={now} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <PagerFooter hasPrev={hasPrev} hasNext={hasNext} page={page} onPrev={prevPage} onNext={nextPage} />
    </div>
  )
}

function SemesterOverview({ semester, now }: { semester: NonNullable<Semester>; now: number }) {
  const categories = useQuery(anyApi.activityCategories.listBySemester, { semesterId: semester._id }) as Category[] | undefined
  const hasUncategorizedActivities = useQuery(anyApi.semesterActivities.hasUncategorized, { semesterId: semester._id }) as boolean | undefined
  const hasUncategorizedExams = useQuery(anyApi.courseActivities.hasUncategorizedExams, { semesterId: semester._id }) as boolean | undefined

  if (categories === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    )
  }

  const hasAnything = categories.length > 0 || hasUncategorizedActivities === true || hasUncategorizedExams === true
  if (!hasAnything) {
    return <EmptyState icon={Calendar} title="Nothing published yet" description="Create a category from the Publish page and publish something under it." />
  }

  return (
    <div className="flex flex-col gap-8">
      {categories.map((category) =>
        category.kind === "exams" ? (
          <ExamsSection key={category._id} label={category.name} categoryId={category._id} semester={semester} now={now} />
        ) : (
          <GeneralSection key={category._id} label={category.name} categoryId={category._id} semester={semester} now={now} />
        )
      )}
      {hasUncategorizedActivities ? <GeneralSection label="Uncategorized" semester={semester} now={now} /> : null}
      {hasUncategorizedExams ? <ExamsSection label="Uncategorized" semester={semester} now={now} /> : null}
    </div>
  )
}

// Read-only, including the semester itself — editing a semester's title/dates lives
// on the Semesters list page (its own "..." row menu), same "manage it where it's
// listed, not on its own detail page" rule that also applies to categories (see
// publish/[categoryId]/page.tsx's own comment) and, on this page, to activities.
export default function SemesterDetailPage() {
  const { semesterId } = useParams<{ semesterId: string }>()
  const semester = useQuery(anyApi.semesters.get, { semesterId }) as Semester | undefined
  const now = useNow()

  if (semester === undefined || now === null) {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{semester.title}</h1>
          {semester.isActive ? (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: "color-mix(in oklch, var(--chart-3) 15%, transparent)", color: "var(--chart-3)" }}
              title={
                semester.activeMode === "manual"
                  ? "Pinned active by admin — won't change automatically"
                  : "Active — set automatically from its dates"
              }
            >
              Active{semester.activeMode === "manual" ? " · pinned" : ""}
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

      <SemesterOverview key={semester._id} semester={semester} now={now} />
    </div>
  )
}
