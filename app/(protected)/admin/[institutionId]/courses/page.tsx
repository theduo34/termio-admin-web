"use client"

import { BookOpen } from "lucide-react"

export default function CoursesPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">Manage courses and course sections.</p>
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
        <BookOpen className="size-8 opacity-40" strokeWidth={1.5} />
        <p className="font-medium text-foreground">Coming soon</p>
        <p className="text-sm">Course management isn&apos;t available yet.</p>
      </div>
    </div>
  )
}
