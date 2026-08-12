"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { Calendar, ChevronDown, ChevronRight, MoreVertical, Pencil, Plus, Radio, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { AcademicYearDialog } from "@/components/features/admin/academic-year-dialog"
import { SemesterDialog } from "@/components/features/admin/semester-dialog"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

type AcademicYear = { _id: string; title: string; startDate: number; endDate: number }
type Semester = {
  _id: string
  title: string
  startDate: number
  endDate: number
  isActive: boolean
  activeMode?: "auto" | "manual"
  academicYearId?: string
}

type SemesterDialogState = { mode: "create" | "edit"; academicYearId: string; semester?: Semester } | null
type DeleteDialogState = { kind: "year" | "semester"; id: string; name: string } | null

function ActivePill({ semester }: { semester: Semester }) {
  if (!semester.isActive) return null
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: "color-mix(in oklch, var(--chart-3) 15%, transparent)", color: "var(--chart-3)" }}
      title={semester.activeMode === "manual" ? "Pinned active by admin" : "Active — set automatically from its dates"}
    >
      Active{semester.activeMode === "manual" ? " · pinned" : ""}
    </span>
  )
}

export default function SemestersPage() {
  const { institutionId } = useParams<{ institutionId: string }>()
  const years = useQuery(anyApi.academicYears.list) as AcademicYear[] | undefined
  const semesters = useQuery(anyApi.semesters.list) as Semester[] | undefined

  const [yearDialog, setYearDialog] = useState<{ mode: "create" | "edit"; year?: AcademicYear } | null>(null)
  const [semesterDialog, setSemesterDialog] = useState<SemesterDialogState>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null)
  // Years the admin has explicitly clicked to toggle away from their default expand
  // state — a Set of overrides, not the expand state itself, so it doesn't need to be
  // seeded once years/semesters actually load (see isYearExpanded below). Keeps the
  // page from becoming an ever-growing wall as more academic years accumulate: only
  // the year containing the active semester (or the most recent one) opens by default.
  const [toggledYearIds, setToggledYearIds] = useState<Set<string>>(new Set())

  const createAcademicYear = useMutation(anyApi.academicYears.createAcademicYear)
  const updateAcademicYear = useMutation(anyApi.academicYears.updateAcademicYear)
  const removeAcademicYear = useMutation(anyApi.academicYears.removeAcademicYear)
  const createSemester = useMutation(anyApi.semesters.createSemester)
  const updateSemester = useMutation(anyApi.semesters.updateSemester)
  const removeSemester = useMutation(anyApi.semesters.removeSemester)
  const setActiveSemester = useMutation(anyApi.semesters.setActiveSemester)

  if (years === undefined || semesters === undefined) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-md" />
        ))}
      </div>
    )
  }

  const semestersByYear = new Map<string, Semester[]>()
  const ungrouped: Semester[] = []
  for (const semester of semesters) {
    if (semester.academicYearId === undefined) {
      ungrouped.push(semester)
      continue
    }
    const list = semestersByYear.get(semester.academicYearId) ?? []
    list.push(semester)
    semestersByYear.set(semester.academicYearId, list)
  }
  for (const list of semestersByYear.values()) list.sort((a, b) => a.startDate - b.startDate)
  ungrouped.sort((a, b) => b.startDate - a.startDate)

  const activeSemester = semesters.find((s) => s.isActive)
  // academicYears.list already sorts newest-first, so years[0] is the fallback when
  // nothing's active yet.
  const defaultExpandedYearId = activeSemester?.academicYearId ?? years[0]?._id ?? null

  function isYearExpanded(yearId: string) {
    const defaultExpanded = yearId === defaultExpandedYearId
    return toggledYearIds.has(yearId) ? !defaultExpanded : defaultExpanded
  }

  function toggleYear(yearId: string) {
    setToggledYearIds((current) => {
      const next = new Set(current)
      if (next.has(yearId)) next.delete(yearId)
      else next.add(yearId)
      return next
    })
  }

  async function handleDelete() {
    if (!deleteDialog) return
    try {
      if (deleteDialog.kind === "year") {
        await removeAcademicYear({ academicYearId: deleteDialog.id })
      } else {
        await removeSemester({ semesterId: deleteDialog.id })
      }
      toast.success("Deleted", { description: `${deleteDialog.name} has been removed.` })
    } catch (err) {
      toast.error("Couldn't delete", {
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      })
      throw err
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Academic years group two semesters each — pick a semester to see its activities.</p>
        <Button size="sm" className="gap-2" onClick={() => setYearDialog({ mode: "create" })}>
          <Plus className="size-4" />
          New academic year
        </Button>
      </div>

      {years.length === 0 && ungrouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
          <Calendar className="size-8 opacity-40" strokeWidth={1.5} />
          <p className="font-medium text-foreground">No academic years yet</p>
          <p className="text-sm">Create one, then add its two semesters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {years.map((year) => {
            const yearSemesters = semestersByYear.get(year._id) ?? []
            const expanded = isYearExpanded(year._id)
            return (
              <div key={year._id} className="flex flex-col gap-3 rounded-md border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleYear(year._id)}
                    className="flex min-w-0 items-center gap-2 text-left outline-none"
                    aria-expanded={expanded}
                  >
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !expanded && "-rotate-90")}
                    />
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-foreground">
                        {year.title}
                        {!expanded ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {yearSemesters.length} semester{yearSemesters.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(year.startDate))} – {dateFormatter.format(new Date(year.endDate))}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setSemesterDialog({ mode: "create", academicYearId: year._id })}
                    >
                      <Plus className="size-3.5" />
                      New semester
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted"
                        aria-label="Academic year actions"
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2.5" onClick={() => setYearDialog({ mode: "edit", year })}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          className="gap-2.5"
                          onClick={() => setDeleteDialog({ kind: "year", id: year._id, name: year.title })}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {!expanded ? null : yearSemesters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No semesters yet — add the first one.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {yearSemesters.map((semester) => (
                      <div
                        key={semester._id}
                        className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3"
                      >
                        <Link
                          href={`/admin/${institutionId}/semesters/${semester._id}`}
                          className="group flex min-w-0 flex-1 items-center gap-3"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Radio className="size-3.5" strokeWidth={2.25} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground group-hover:underline">{semester.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {dateFormatter.format(new Date(semester.startDate))} – {dateFormatter.format(new Date(semester.endDate))}
                            </p>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <ActivePill semester={semester} />
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted"
                              aria-label="Semester actions"
                            >
                              <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!semester.isActive ? (
                                <DropdownMenuItem
                                  className="gap-2.5"
                                  onClick={() => void setActiveSemester({ semesterId: semester._id })}
                                >
                                  <Radio className="size-4" />
                                  Set active
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                className="gap-2.5"
                                onClick={() => setSemesterDialog({ mode: "edit", academicYearId: year._id, semester })}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                className="gap-2.5"
                                onClick={() => setDeleteDialog({ kind: "semester", id: semester._id, name: semester.title })}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ChevronRight className="size-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {ungrouped.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Ungrouped</h2>
                <p className="text-xs text-muted-foreground">Predates academic years — not tied to one.</p>
              </div>
              <div className="flex flex-col gap-2">
                {ungrouped.map((semester) => (
                  <Link
                    key={semester._id}
                    href={`/admin/${institutionId}/semesters/${semester._id}`}
                    className="group flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Radio className="size-3.5" strokeWidth={2.25} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{semester.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {dateFormatter.format(new Date(semester.startDate))} – {dateFormatter.format(new Date(semester.endDate))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ActivePill semester={semester} />
                      <ChevronRight className="size-4 text-muted-foreground/50" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <AcademicYearDialog
        open={yearDialog !== null}
        onOpenChange={(open) => !open && setYearDialog(null)}
        initialValue={yearDialog?.year}
        onSubmit={async (values) => {
          if (yearDialog?.mode === "edit" && yearDialog.year) {
            await updateAcademicYear({ academicYearId: yearDialog.year._id, ...values })
            toast.success("Saved", { description: `"${values.title}" was updated.` })
          } else {
            await createAcademicYear(values)
            toast.success("Added", { description: `"${values.title}" was created.` })
          }
        }}
      />

      <SemesterDialog
        open={semesterDialog !== null}
        onOpenChange={(open) => !open && setSemesterDialog(null)}
        initialValue={semesterDialog?.semester}
        onSubmit={async (values) => {
          if (!semesterDialog) return
          if (semesterDialog.mode === "edit" && semesterDialog.semester) {
            await updateSemester({ semesterId: semesterDialog.semester._id, ...values })
            toast.success("Saved", { description: `"${values.title}" was updated.` })
          } else {
            await createSemester({ academicYearId: semesterDialog.academicYearId, ...values })
            toast.success("Added", { description: `"${values.title}" was created.` })
          }
        }}
      />

      <ConfirmDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title={`Delete ${deleteDialog?.name ?? ""}?`}
        description="This can't be undone. Anything still published under it must be removed first."
        pendingLabel="Deleting..."
        onConfirm={handleDelete}
      />
    </div>
  )
}
