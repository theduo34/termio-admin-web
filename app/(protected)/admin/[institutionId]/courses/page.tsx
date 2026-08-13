"use client"

import { BookOpen, Sparkles } from "lucide-react"

export default function CoursesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Courses</h2>
        <p className="text-sm text-muted-foreground">Scoped per class — a student only ever sees their own</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border bg-muted/30 px-6 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <BookOpen className="size-8 text-primary" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3" />
            In development
          </span>
          <p className="text-lg font-semibold text-foreground">Course management is coming soon</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Creating courses and importing timetables from here is being rebuilt. Until then, reach out to the
            engineering team for catalogue changes.
          </p>
        </div>
      </div>
    </div>
  )
}
