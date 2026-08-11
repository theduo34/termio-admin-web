"use client"

import Link from "next/link"
import { ChevronRight, Network, Calendar, BookOpen, Megaphone, type LucideIcon } from "lucide-react"

const ACTIONS: { label: string; description: string; path: string; icon: LucideIcon }[] = [
  { label: "Hierarchy", description: "Faculties, departments, programs, classes", path: "hierarchy", icon: Network },
  { label: "Semesters", description: "Academic years and active semester", path: "semesters", icon: Calendar },
  { label: "Courses", description: "Course catalogue and sections", path: "courses", icon: BookOpen },
  { label: "Publish", description: "Institution-wide activities", path: "publish", icon: Megaphone },
]

export function QuickActionsPanel({ base }: { base: string }) {
  return (
    <div className="flex h-full flex-col gap-1 rounded-md border border-border bg-card p-3">
      <h2 className="px-2.5 pt-1.5 pb-2 text-base font-semibold text-foreground">Manage</h2>
      {ACTIONS.map(({ label, description, path, icon: Icon }) => (
        <Link
          key={path}
          href={`${base}/${path}`}
          className="group flex items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors hover:bg-muted"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          </div>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
        </Link>
      ))}
    </div>
  )
}
