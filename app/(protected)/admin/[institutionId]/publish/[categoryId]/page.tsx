"use client"

import { Suspense, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { Clock, FileQuestion, Pencil, Plus, Radio, Trash2, Upload } from "lucide-react"
import { useParams, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { AddActivityDialog } from "@/components/features/admin/add-activity-dialog"
import { EditActivityDialog } from "@/components/features/admin/edit-activity-dialog"
import { ImportActivitiesDialog } from "@/components/features/admin/import-activities-dialog"
import { ImportExamsDialog } from "@/components/features/admin/import-exams-dialog"
import { EditExamDialog } from "@/components/features/admin/edit-exam-dialog"
import { useCursorPage } from "@/hooks/use-cursor-page"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
const PAGE_SIZE = 10

type Category = { _id: string; semesterId: string; name: string; description?: string; kind?: "general" | "exams" }
type Activity = { _id: string; title: string; description?: string; date: number }
type Exam = { _id: string; title: string; dueDate: number; notes?: string }

function RowShell({
  icon: Icon,
  title,
  subtitle,
  date,
  onEdit,
  onDelete,
}: {
  icon: typeof Radio
  title: string
  subtitle?: string
  date: number
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-3.5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {dateFormatter.format(new Date(date))}
      </span>
      <div className="flex shrink-0 gap-1">
        <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function PagerFooter({
  hasPrev,
  hasNext,
  page,
  onPrev,
  onNext,
}: {
  hasPrev: boolean
  hasNext: boolean
  page: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
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

function GeneralCategoryBody({ category, autoOpenImport }: { category: Category; autoOpenImport: boolean }) {
  const { items, isLoading, hasNext, hasPrev, page, nextPage, prevPage } = useCursorPage<Activity>(
    anyApi.semesterActivities.listActivitiesByCategoryPaginated,
    { categoryId: category._id },
    PAGE_SIZE
  )

  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(autoOpenImport)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null)

  const createActivity = useMutation(anyApi.semesterActivities.createSemesterActivity)
  const updateActivity = useMutation(anyApi.semesterActivities.updateSemesterActivity)
  const removeActivity = useMutation(anyApi.semesterActivities.removeSemesterActivity)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <Upload className="size-4" />
          Import document
        </Button>
        <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add activity
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : items && items.length === 0 && page === 1 ? (
        <EmptyState
          icon={Radio}
          title="No activities published yet"
          description="Add one, or import a whole document to fill this category at once."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items?.map((activity) => (
            <RowShell
              key={activity._id}
              icon={Radio}
              title={activity.title}
              subtitle={activity.description}
              date={activity.date}
              onEdit={() => setEditActivity(activity)}
              onDelete={() => setDeleteActivity(activity)}
            />
          ))}
        </div>
      )}

      <PagerFooter hasPrev={hasPrev} hasNext={hasNext} page={page} onPrev={prevPage} onNext={nextPage} />

      <AddActivityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (values) => {
          await createActivity({ categoryId: category._id, ...values })
          toast.success("Published", { description: `"${values.title}" is now visible to every student.` })
        }}
      />

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
          try {
            await removeActivity({ semesterActivityId: deleteActivity._id })
            toast.success("Deleted", { description: `"${deleteActivity.title}" was removed.` })
          } catch (err) {
            toast.error("Couldn't delete", {
              description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
            })
            throw err
          }
        }}
      />

      <ImportActivitiesDialog open={importOpen} onOpenChange={setImportOpen} categoryId={category._id} />
    </div>
  )
}

function ExamsCategoryBody({ category, autoOpenImport }: { category: Category; autoOpenImport: boolean }) {
  const { items, isLoading, hasNext, hasPrev, page, nextPage, prevPage } = useCursorPage<Exam>(
    anyApi.courseActivities.listExamsByCategoryPaginated,
    { categoryId: category._id },
    PAGE_SIZE
  )

  const [importOpen, setImportOpen] = useState(autoOpenImport)
  const [editExam, setEditExam] = useState<Exam | null>(null)
  const [deleteExam, setDeleteExam] = useState<Exam | null>(null)

  const updateExam = useMutation(anyApi.courseActivities.update)
  const removeExam = useMutation(anyApi.courseActivities.remove)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Matched to existing courses by code — import the Teaching Timetable first</p>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <Upload className="size-4" />
          Import exam timetable
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : items && items.length === 0 && page === 1 ? (
        <EmptyState
          icon={FileQuestion}
          title="No exams published yet"
          description="Import a regular or resit exam timetable to get started."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items?.map((exam) => (
            <RowShell
              key={exam._id}
              icon={FileQuestion}
              title={exam.title}
              subtitle={exam.notes}
              date={exam.dueDate}
              onEdit={() => setEditExam(exam)}
              onDelete={() => setDeleteExam(exam)}
            />
          ))}
        </div>
      )}

      <PagerFooter hasPrev={hasPrev} hasNext={hasNext} page={page} onPrev={prevPage} onNext={nextPage} />

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

      <ImportExamsDialog open={importOpen} onOpenChange={setImportOpen} categoryId={category._id} />
    </div>
  )
}

// Editing/deleting the category itself lives only on the Publish page's listing —
// not here. This page is scoped to the category's activities; renaming or removing
// the category is a decision made from where every category is seen side by side,
// not from inside any one of them.
function CategoryDetail({ category, autoOpenImport }: { category: Category; autoOpenImport: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{category.name}</h1>
        {category.description ? <p className="mt-1 text-sm text-muted-foreground">{category.description}</p> : null}
      </div>

      {category.kind === "exams" ? (
        <ExamsCategoryBody category={category} autoOpenImport={autoOpenImport} />
      ) : (
        <GeneralCategoryBody category={category} autoOpenImport={autoOpenImport} />
      )}
    </div>
  )
}

function CategoryPageInner() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const searchParams = useSearchParams()
  const category = useQuery(anyApi.activityCategories.getCategory, { categoryId }) as Category | null | undefined

  if (category === undefined) {
    return <Skeleton className="h-64 w-full rounded-md" />
  }
  if (category === null) {
    return <EmptyState icon={Radio} title="Category not found" description="It may have been deleted." />
  }

  return <CategoryDetail key={categoryId} category={category} autoOpenImport={searchParams.get("upload") === "1"} />
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-md" />}>
      <CategoryPageInner />
    </Suspense>
  )
}
