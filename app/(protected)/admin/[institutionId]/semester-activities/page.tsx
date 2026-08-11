"use client"

import { Radio } from "lucide-react"

export default function SemesterActivitiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">Publish institution-wide events visible to every student.</p>
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
        <Radio className="size-8 opacity-40" strokeWidth={1.5} />
        <p className="font-medium text-foreground">Coming soon</p>
        <p className="text-sm">Publishing isn&apos;t available yet — see the Publish tab.</p>
      </div>
    </div>
  )
}
