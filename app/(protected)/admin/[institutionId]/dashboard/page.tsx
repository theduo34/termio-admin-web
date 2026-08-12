"use client"

import { useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { useParams } from "next/navigation"
import { Users, Building2, Library, BookOpen } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHero } from "@/components/shared/dashboard/dashboard-hero"
import { QuickActionsPanel } from "@/components/shared/dashboard/quick-actions-panel"
import { RankedListCard } from "@/components/shared/dashboard/ranked-list-card"
import { StatRow } from "@/components/shared/dashboard/stat-row"

type Overview = {
  institution: { name: string; emailDomain: string } | null
  activeSemester: { _id: string; title: string; startDate: number; endDate: number } | null
  counts: { students: number; faculties: number; departments: number; courses: number }
  facultyBreakdown: { facultyId: string; name: string; studentCount: number }[]
}

// A live useQuery, not the one-time server-side fetchQuery this page used to do —
// every other page in this app is reactive (see e.g. courses/page.tsx,
// publish/page.tsx); this one wasn't, so its stat counts and active-semester banner
// could silently go stale after a create/publish/activate elsewhere without a full
// page reload. convex/ isn't owned by this repo (see AGENTS.md), so there's no
// generated `api` for it — anyApi calls the mobile repo's convex/adminDashboard.ts
// #getOverview by name, same as it always did.
export default function DashboardPage() {
  const { institutionId } = useParams<{ institutionId: string }>()
  const base = `/admin/${institutionId}`
  const overview = useQuery(anyApi.adminDashboard.getOverview) as Overview | undefined

  if (overview === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-md lg:col-span-2" />
          <Skeleton className="h-64 rounded-md" />
        </div>
      </div>
    )
  }

  const stats = [
    { label: "Students", value: overview.counts.students.toLocaleString(), icon: Users },
    { label: "Faculties", value: overview.counts.faculties.toLocaleString(), icon: Building2 },
    { label: "Departments", value: overview.counts.departments.toLocaleString(), icon: Library },
    { label: "Courses", value: overview.counts.courses.toLocaleString(), icon: BookOpen },
  ]

  const totalStudents = overview.counts.students
  const facultyItems = overview.facultyBreakdown.map((faculty) => ({
    id: faculty.facultyId,
    label: faculty.name,
    value: faculty.studentCount,
    share: totalStudents > 0 ? Math.round((faculty.studentCount / totalStudents) * 100) : 0,
  }))

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        institutionName={overview.institution?.name ?? "Unconfigured institution"}
        activeSemester={overview.activeSemester}
        href={overview.activeSemester ? `${base}/semesters/${overview.activeSemester._id}` : undefined}
      />

      <StatRow stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RankedListCard
            title="Students by faculty"
            subtitle="Share of enrolled students per faculty"
            items={facultyItems}
            totalLabel={`${totalStudents.toLocaleString()} students total`}
          />
        </div>
        <QuickActionsPanel base={base} />
      </div>
    </div>
  )
}
