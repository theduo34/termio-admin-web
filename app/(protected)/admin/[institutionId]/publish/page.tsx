"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { ChevronRight, FileQuestion, Inbox, MoreVertical, Pencil, Plus, Radio, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { CategoryDialog } from "@/components/features/admin/category-dialog"
import { sortYearsCurrentFirst } from "@/lib/sortYears"

type AcademicYear = { _id: string; title: string; startDate: number; endDate: number }
type Semester = { _id: string; title: string; isActive: boolean; academicYearId?: string; startDate: number }
type Category = { _id: string; name: string; description?: string; kind?: "general" | "exams" }

const selectClassName =
  "h-9 min-w-[180px] border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"

export default function PublishPage() {
  const router = useRouter()
  const { institutionId } = useParams<{ institutionId: string }>()
  const years = useQuery(anyApi.academicYears.list) as AcademicYear[] | undefined
  const semesters = useQuery(anyApi.semesters.list) as Semester[] | undefined
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null)
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null)
  const [categoryDialog, setCategoryDialog] = useState<{ mode: "create" | "edit"; category?: Category } | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)

  const createCategory = useMutation(anyApi.activityCategories.createCategory)
  const updateCategory = useMutation(anyApi.activityCategories.updateCategory)
  const removeCategory = useMutation(anyApi.activityCategories.removeCategory)

  if (years === undefined || semesters === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-80 rounded-md" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  if (years.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title="No academic years yet"
        description="Create one from the Semesters page before publishing anything here."
      />
    )
  }

  const activeSemester = semesters.find((s) => s.isActive)
  const sortedYears = sortYearsCurrentFirst(years, activeSemester?.academicYearId ?? null)
  const displayYearId = selectedYearId ?? activeSemester?.academicYearId ?? sortedYears[0]._id

  const yearSemesters = semesters
    .filter((s) => s.academicYearId === displayYearId)
    .sort((a, b) => a.startDate - b.startDate)
  const displaySemesterId =
    selectedSemesterId ??
    (activeSemester?.academicYearId === displayYearId ? activeSemester._id : undefined) ??
    yearSemesters[0]?._id ??
    null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={displayYearId}
          onChange={(event) => {
            setSelectedYearId(event.target.value)
            setSelectedSemesterId(null)
          }}
          className={selectClassName}
          aria-label="Academic year"
        >
          {sortedYears.map((year) => (
            <option key={year._id} value={year._id}>
              {year.title}
            </option>
          ))}
        </select>

        <select
          value={displaySemesterId ?? ""}
          onChange={(event) => setSelectedSemesterId(event.target.value)}
          disabled={yearSemesters.length === 0}
          className={selectClassName}
          aria-label="Semester"
        >
          {yearSemesters.length === 0 ? <option value="">No semesters</option> : null}
          {yearSemesters.map((semester) => (
            <option key={semester._id} value={semester._id}>
              {semester.title}
              {semester.isActive ? " · Active" : ""}
            </option>
          ))}
        </select>
      </div>

      {displaySemesterId === null ? (
        <p className="text-sm text-muted-foreground">
          This academic year has no semesters yet — add one from the Semesters page.
        </p>
      ) : (
        <CategoriesForSemester
          semesterId={displaySemesterId}
          onCreate={() => setCategoryDialog({ mode: "create" })}
          onEdit={(category) => setCategoryDialog({ mode: "edit", category })}
          onDelete={setDeleteCategory}
        />
      )}

      <CategoryDialog
        open={categoryDialog !== null}
        onOpenChange={(open) => !open && setCategoryDialog(null)}
        initialValue={categoryDialog?.category}
        onSubmit={async (values) => {
          if (!categoryDialog) return
          if (categoryDialog.mode === "edit" && categoryDialog.category) {
            // kind is deliberately not passed through — it's immutable after
            // creation and updateCategory's own args don't accept it (see that
            // mutation and CategoryDialog's own comments).
            await updateCategory({ categoryId: categoryDialog.category._id, name: values.name, description: values.description })
            toast.success("Saved", { description: `"${values.name}" was updated.` })
          } else {
            if (!displaySemesterId) return
            const categoryId = await createCategory({ semesterId: displaySemesterId, ...values })
            toast.success("Created", { description: `"${values.name}" is ready.` })
            // Straight to the category page with the import prompt open — see that
            // page's own handling of the `upload` param. Closing that prompt still
            // leaves admin on the category page with Import Document/Add Activity
            // both available, never stranded back on this landing page.
            router.push(`/admin/${institutionId}/publish/${categoryId}?upload=1`)
          }
        }}
      />

      <ConfirmDialog
        open={deleteCategory !== null}
        onOpenChange={(open) => !open && setDeleteCategory(null)}
        title={`Delete "${deleteCategory?.name ?? ""}"?`}
        description="This can't be undone — every activity published under this category is deleted too, not just the category itself."
        pendingLabel="Deleting..."
        onConfirm={async () => {
          if (!deleteCategory) return
          try {
            await removeCategory({ categoryId: deleteCategory._id })
            toast.success("Deleted", { description: `"${deleteCategory.name}" was removed.` })
          } catch (err) {
            toast.error("Couldn't delete", {
              description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
            })
            throw err
          }
        }}
      />
    </div>
  )
}

function CategoriesForSemester({
  semesterId,
  onCreate,
  onEdit,
  onDelete,
}: {
  semesterId: string
  onCreate: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  const categories = useQuery(anyApi.activityCategories.listBySemester, { semesterId }) as Category[] | undefined
  // Anything published before the category system existed (or written directly,
  // e.g. convex/seed.ts's demo data) has no categoryId — it's still real, still
  // shows on the Semester detail page, so it needs a discoverable home here too
  // rather than silently not appearing under any category. Cheap existence checks,
  // not counts — sizing a badge isn't worth fetching everything just to count it.
  const hasUncategorizedActivities = useQuery(anyApi.semesterActivities.hasUncategorized, { semesterId }) as
    | boolean
    | undefined
  const hasUncategorizedExams = useQuery(anyApi.courseActivities.hasUncategorizedExams, { semesterId }) as
    | boolean
    | undefined
  const showUncategorizedTile = hasUncategorizedActivities === true || hasUncategorizedExams === true
  const { institutionId } = useParams<{ institutionId: string }>()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Categories</h2>
          <p className="text-sm text-muted-foreground">Organize what you publish for this semester</p>
        </div>
        <Button size="sm" className="gap-2" onClick={onCreate}>
          <Plus className="size-4" />
          New category
        </Button>
      </div>

      {categories === undefined ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
      ) : categories.length === 0 && !showUncategorizedTile ? (
        <EmptyState
          icon={Radio}
          title="No categories yet"
          description="Create one — e.g. Academic Calendar — then publish activities under it."
          action={
            <Button size="sm" className="gap-2" onClick={onCreate}>
              <Plus className="size-4" />
              New category
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {showUncategorizedTile ? (
            <Link href={`/admin/${institutionId}/publish/uncategorized?semesterId=${semesterId}`}>
              <Card className="h-full border-dashed border-border/60 transition-colors hover:border-primary/40 hover:bg-muted/40">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Inbox className="size-4.5" strokeWidth={2.25} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">Uncategorized</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">Published before categories existed</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : null}
          {categories.map((category) => (
            <Card key={category._id} className="border-border/60 transition-colors hover:border-primary/40 hover:bg-muted/40">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/admin/${institutionId}/publish/${category._id}`} className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {category.kind === "exams" ? (
                      <FileQuestion className="size-4.5" strokeWidth={2.25} />
                    ) : (
                      <Radio className="size-4.5" strokeWidth={2.25} />
                    )}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted"
                      aria-label="Category actions"
                    >
                      <MoreVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2.5" onClick={() => onEdit(category)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" className="gap-2.5" onClick={() => onDelete(category)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link href={`/admin/${institutionId}/publish/${category._id}`} className="group flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:underline">{category.name}</p>
                    {category.description ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{category.description}</p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
