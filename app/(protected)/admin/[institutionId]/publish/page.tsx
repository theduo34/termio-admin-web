"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { Calendar, Plus, Radio, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

export default function PublishPage() {
  const semesters = useQuery(anyApi.semesters.list)
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null)

  const activeSemester = semesters?.find((s: any) => s.isActive)
  const displaySemesterId = selectedSemesterId ?? activeSemester?._id ?? null

  // listBySemester lives in convex/alerts.ts, not a semesterActivities module — see
  // that file's own comment on why.
  const activities = useQuery(
    anyApi.alerts.listBySemester,
    displaySemesterId ? { semesterId: displaySemesterId } : "skip"
  )

  if (semesters === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-md" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Semester Selector */}
      <div className="flex flex-wrap gap-2">
        {semesters.map((s: any) => (
          <button
            key={s._id}
            onClick={() => setSelectedSemesterId(s._id)}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all outline-none ${
              (s._id === displaySemesterId)
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Calendar className="size-4" />
            {s.title}
            {s.isActive && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">Active</span>
            )}
          </button>
        ))}
      </div>

      {/* Activities Grid */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Semester Activities</h2>
            <p className="text-sm text-muted-foreground">Institution-wide events visible to all students</p>
          </div>
          <Button size="sm" className="gap-2 rounded-md" disabled>
            <Plus className="size-4" />
            Add Activity
          </Button>
        </div>

        {activities === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-md" />)}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16 text-muted-foreground">
            <Radio className="size-10 mb-3 opacity-30" strokeWidth={1.5} />
            <p className="font-medium text-foreground">No activities published yet</p>
            <p className="text-sm mt-1">Add semester activities for students to see</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((a: any) => (
              <Card key={a._id} className="border-border/60">
                <CardContent className="p-5 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{a.title}</h3>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="size-3.5" />
                      {dateFormatter.format(new Date(a.date))}
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{a.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
