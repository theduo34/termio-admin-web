"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { Plus, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AddCourseDialog } from "@/components/features/admin/add-course-dialog"
import { ImportTimetableDialog } from "@/components/features/admin/import-timetable-dialog"
import { CourseList } from "@/components/features/admin/course-list"

type Semester = { _id: string; title: string; isActive: boolean }

const selectClassName =
  "h-9 min-w-[180px] border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"

export default function CoursesPage() {
  const semesters = useQuery(anyApi.semesters.list) as Semester[] | undefined
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const activeSemester = semesters?.find((s) => s.isActive)
  const displaySemesterId = selectedSemesterId ?? activeSemester?._id ?? null

  const createCourse = useMutation(anyApi.courses.createCourse)

  if (semesters === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <select
        value={displaySemesterId ?? ""}
        onChange={(event) => setSelectedSemesterId(event.target.value)}
        className={selectClassName}
        aria-label="Semester"
      >
        {semesters.length === 0 ? <option value="">No semesters</option> : null}
        {semesters.map((s) => (
          <option key={s._id} value={s._id}>
            {s.title}
            {s.isActive ? " · Active" : ""}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Courses</h2>
            <p className="text-sm text-muted-foreground">Scoped per class — a student only ever sees their own</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Import timetable
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add course
            </Button>
          </div>
        </div>

        {displaySemesterId ? <CourseList semesterId={displaySemesterId} /> : null}
      </div>

      <AddCourseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (values) => {
          if (!displaySemesterId) return
          await createCourse({ semesterId: displaySemesterId, ...values })
          toast.success("Added", { description: `"${values.courseCode}" is now visible to that class.` })
        }}
      />

      {displaySemesterId ? (
        <ImportTimetableDialog open={importOpen} onOpenChange={setImportOpen} semesterId={displaySemesterId} />
      ) : null}
    </div>
  )
}
