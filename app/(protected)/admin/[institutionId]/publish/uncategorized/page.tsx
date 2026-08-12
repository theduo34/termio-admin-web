"use client"

import { Suspense, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { Clock, FileQuestion, Inbox, Pencil, Radio, Trash2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EditActivityDialog } from "@/components/features/admin/edit-activity-dialog"
import { EditExamDialog } from "@/components/features/admin/edit-exam-dialog"
import { useCursorPage } from "@/hooks/use-cursor-page"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
const PAGE_SIZE = 10

const selectClassName =
  "h-8 border border-border bg-background px-2 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"

type Category = { _id: string; name: string; kind?: "general" | "exams" }
type GeneralActivity = { _id: string; title: string; description?: string; date: number }
type ExamActivity = { _id: string; title: string; dueDate: number; notes?: string }

type Row =
  | { kind: "general"; key: string; date: number; activity: GeneralActivity }
  | { kind: "exam"; key: string; date: number; exam: ExamActivity }

// One unified list, not two labeled "General activities" / "Exams" sections — those
// section names were categories the app invented, not ones admin created (see the
// Semester detail page's own comment on the same thing), which is exactly wrong for
// a page whose entire point is "here's everything that has no real category yet."
// Still two independently paginated queries under the hood (semesterActivities and
// courseActivities are different tables) — see hooks/use-cursor-page.ts — but driven
// by one shared Previous/Next pair so it reads as one list, not two side by side.
function UncategorizedContent({ semesterId }: { semesterId: string }) {
  const categories = useQuery(anyApi.activityCategories.listBySemester, { semesterId }) as Category[] | undefined

  const general = useCursorPage<GeneralActivity>(anyApi.semesterActivities.listUncategorizedBySemesterPaginated, { semesterId }, PAGE_SIZE)
  const exams = useCursorPage<ExamActivity>(anyApi.courseActivities.listUncategorizedExamsBySemesterPaginated, { semesterId }, PAGE_SIZE)

  const [editActivity, setEditActivity] = useState<GeneralActivity | null>(null)
  const [deleteActivity, setDeleteActivity] = useState<GeneralActivity | null>(null)
  const [editExam, setEditExam] = useState<ExamActivity | null>(null)
  const [deleteExam, setDeleteExam] = useState<ExamActivity | null>(null)

  const updateActivity = useMutation(anyApi.semesterActivities.updateSemesterActivity)
  const removeActivity = useMutation(anyApi.semesterActivities.removeSemesterActivity)
  const updateExam = useMutation(anyApi.courseActivities.update)
  const removeExam = useMutation(anyApi.courseActivities.remove)

  const isLoading = categories === undefined || general.items === undefined || exams.items === undefined

  const rows: Row[] = isLoading
    ? []
    : [
        ...(general.items ?? []).map((activity): Row => ({ kind: "general", key: `g-${activity._id}`, date: activity.date, activity })),
        ...(exams.items ?? []).map((exam): Row => ({ kind: "exam", key: `e-${exam._id}`, date: exam.dueDate, exam })),
      ].sort((a, b) => a.date - b.date)

  const generalCategories = (categories ?? []).filter((c) => c.kind !== "exams")
  const examCategories = (categories ?? []).filter((c) => c.kind === "exams")

  const hasNext = general.hasNext || exams.hasNext
  const hasPrev = general.hasPrev || exams.hasPrev
  function nextPage() {
    if (general.hasNext) general.nextPage()
    if (exams.hasNext) exams.nextPage()
  }
  function prevPage() {
    if (general.hasPrev) general.prevPage()
    if (exams.hasPrev) exams.prevPage()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Uncategorized</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Published before categories existed. Assign each one to a category, or leave it — it still shows on the
          Semester detail page either way.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 && general.page === 1 && exams.page === 1 ? (
        <EmptyState icon={Inbox} title="Nothing uncategorized" description="Everything here has a category now." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const availableCategories = row.kind === "exam" ? examCategories : generalCategories
            const title = row.kind === "exam" ? row.exam.title : row.activity.title
            const subtitle = row.kind === "exam" ? row.exam.notes : row.activity.description
            return (
              <div key={row.key} className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {row.kind === "exam" ? <FileQuestion className="size-3.5" strokeWidth={2.25} /> : <Radio className="size-3.5" strokeWidth={2.25} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{title}</p>
                  {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  {dateFormatter.format(new Date(row.date))}
                </span>
                <select
                  defaultValue=""
                  disabled={availableCategories.length === 0}
                  onChange={async (event) => {
                    const categoryId = event.target.value
                    if (!categoryId) return
                    if (row.kind === "general") {
                      await updateActivity({
                        semesterActivityId: row.activity._id,
                        categoryId,
                        title: row.activity.title,
                        description: row.activity.description,
                        date: row.activity.date,
                      })
                    } else {
                      await updateExam({ activityId: row.exam._id, categoryId })
                    }
                    toast.success("Moved", { description: `"${title}" was assigned to a category.` })
                  }}
                  className={selectClassName}
                  aria-label="Move to category"
                >
                  <option value="" disabled>
                    {availableCategories.length === 0 ? "No category to move to" : "Move to…"}
                  </option>
                  {availableCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit"
                    onClick={() => (row.kind === "general" ? setEditActivity(row.activity) : setEditExam(row.exam))}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete"
                    onClick={() => (row.kind === "general" ? setDeleteActivity(row.activity) : setDeleteExam(row.exam))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && (hasNext || hasPrev) ? (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button size="sm" variant="outline" disabled={!hasPrev} onClick={prevPage}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={!hasNext} onClick={nextPage}>
            Next
          </Button>
        </div>
      ) : null}

      <EditActivityDialog
        open={editActivity !== null}
        onOpenChange={(open) => !open && setEditActivity(null)}
        activity={editActivity}
        onSubmit={async (values) => {
          if (!editActivity) return
          await updateActivity({ semesterActivityId: editActivity._id, ...values })
          toast.success("Saved", { description: `"${values.title}" was updated.` })
        }}
      />
      <ConfirmDialog
        open={deleteActivity !== null}
        onOpenChange={(open) => !open && setDeleteActivity(null)}
        title={`Delete "${deleteActivity?.title ?? ""}"?`}
        description="This can't be undone. Students will no longer see this activity."
        pendingLabel="Deleting..."
        onConfirm={async () => {
          if (!deleteActivity) return
          await removeActivity({ semesterActivityId: deleteActivity._id })
          toast.success("Deleted", { description: `"${deleteActivity.title}" was removed.` })
        }}
      />

      <EditExamDialog
        open={editExam !== null}
        onOpenChange={(open) => !open && setEditExam(null)}
        exam={editExam}
        onSubmit={async (values) => {
          if (!editExam) return
          await updateExam({ activityId: editExam._id, ...values })
          toast.success("Saved", { description: `"${values.title}" was updated.` })
        }}
      />
      <ConfirmDialog
        open={deleteExam !== null}
        onOpenChange={(open) => !open && setDeleteExam(null)}
        title={`Delete "${deleteExam?.title ?? ""}"?`}
        description="This can't be undone. Affected students will no longer see this exam."
        pendingLabel="Deleting..."
        onConfirm={async () => {
          if (!deleteExam) return
          await removeExam({ activityId: deleteExam._id })
          toast.success("Deleted", { description: `"${deleteExam.title}" was removed.` })
        }}
      />
    </div>
  )
}

function UncategorizedPageInner() {
  const searchParams = useSearchParams()
  const semesterId = searchParams.get("semesterId")

  if (!semesterId) {
    return <EmptyState icon={Inbox} title="No semester selected" description="Get here from the Publish page." />
  }

  return <UncategorizedContent key={semesterId} semesterId={semesterId} />
}

export default function UncategorizedPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-md" />}>
      <UncategorizedPageInner />
    </Suspense>
  )
}
