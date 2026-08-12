"use client"

import { useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { BookOpen } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"

type Course = { _id: string; academicClassId: string; courseCode: string; courseTitle: string; colourTag: string }
type ClassDetails = { programName: string; level: number; session: "REGULAR" | "WEEKEND" }

// One useQuery per distinct academicClassId a semester's courses reference — can't
// batch this into the parent's own query without a new backend endpoint, and a course
// list is small enough per semester that N small queries (Convex dedupes/caches these
// client-side per args anyway) is simpler than adding one.
function ClassGroupLabel({ academicClassId }: { academicClassId: string }) {
  const details = useQuery(anyApi.academicStructure.getClassDetails, { academicClassId }) as
    | ClassDetails
    | null
    | undefined

  if (details === undefined) return <Skeleton className="h-4 w-48" />
  if (details === null) return <span className="text-sm font-semibold text-foreground">Unknown class</span>
  return (
    <span className="text-sm font-semibold text-foreground">
      {details.programName} · Level {details.level} · {details.session === "REGULAR" ? "Regular" : "Weekend"}
    </span>
  )
}

// The flat, semester-scoped course list — a plain page, no browsing/drill-down: pick
// a semester, see every class's courses, grouped under a label naming that class.
export function CourseList({ semesterId }: { semesterId: string }) {
  const courses = useQuery(anyApi.courses.listCoursesBySemester, { semesterId }) as Course[] | undefined

  const groupedByClass = courses?.reduce<Map<string, Course[]>>((acc, course) => {
    const list = acc.get(course.academicClassId) ?? []
    list.push(course)
    acc.set(course.academicClassId, list)
    return acc
  }, new Map())

  if (courses === undefined) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No courses published yet"
        description="Add one, or import a whole timetable from a document."
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {Array.from(groupedByClass!.entries()).map(([academicClassId, classCourses]) => (
        <div key={academicClassId} className="flex flex-col gap-2">
          <ClassGroupLabel academicClassId={academicClassId} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {classCourses.map((course) => (
              <Card key={course._id} className="border-border/60">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: course.colourTag }} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">{course.courseCode}</span>
                    <span className="text-sm text-muted-foreground">{course.courseTitle}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
