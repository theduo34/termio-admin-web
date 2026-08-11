import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { fetchQuery } from "convex/nextjs"
import { anyApi } from "convex/server"
import { Users, Building2, Library, BookOpen } from "lucide-react"

import { DashboardHero } from "@/components/shared/dashboard/dashboard-hero"
import { QuickActionsPanel } from "@/components/shared/dashboard/quick-actions-panel"
import { RankedListCard } from "@/components/shared/dashboard/ranked-list-card"
import { StatRow } from "@/components/shared/dashboard/stat-row"

interface Props {
  params: Promise<{ institutionId: string }>
}

// convex/ isn't owned by this repo (see AGENTS.md), so there's no generated `api` for
// it — anyApi calls the mobile repo's convex/adminDashboard.ts#getOverview by name.
export default async function DashboardPage({ params }: Props) {
  const { institutionId } = await params
  const base = `/admin/${institutionId}`

  const token = await convexAuthNextjsToken()
  const overview = await fetchQuery(anyApi.adminDashboard.getOverview, {}, { token })

  const stats = [
    { label: "Students", value: overview.counts.students.toLocaleString(), icon: Users },
    { label: "Faculties", value: overview.counts.faculties.toLocaleString(), icon: Building2 },
    { label: "Departments", value: overview.counts.departments.toLocaleString(), icon: Library },
    { label: "Courses", value: overview.counts.courses.toLocaleString(), icon: BookOpen },
  ]

  const totalStudents = overview.counts.students
  const facultyItems = overview.facultyBreakdown.map(
    (faculty: { facultyId: string; name: string; studentCount: number }) => ({
      id: faculty.facultyId,
      label: faculty.name,
      value: faculty.studentCount,
      share: totalStudents > 0 ? Math.round((faculty.studentCount / totalStudents) * 100) : 0,
    }),
  )

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
