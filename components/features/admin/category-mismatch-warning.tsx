"use client"

import { TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { CATEGORY_LABELS } from "@/lib/detectDocumentCategory"

// Only these two are ever passed in — a filename that looks like a calendar/generic
// document is never a mismatch anywhere anymore: Publish's admin-created categories
// are generic buckets (any calendar-shaped content belongs there by definition). See
// lib/detectDocumentCategory.ts.
type StructuredCategory = "timetable" | "exam"

// "exam" has no single fixed destination anymore — exams live as admin-created
// 'exams'-kind categories under Publish (see activityCategories.ts), not a dedicated
// page, so the link goes to the Publish landing page where admin picks or creates
// one, not straight to a specific category. "timetable" still has one real page.
const CATEGORY_PATHS: Record<StructuredCategory, string> = {
  timetable: "courses",
  exam: "publish",
}

const CATEGORY_ACTION_LABELS: Record<StructuredCategory, string> = {
  timetable: "Go to Courses",
  exam: "Go to Publish",
}

// Shown when a chosen file's own name suggests it belongs somewhere structured
// (Courses, or an Exams-kind category reached from Publish) other than where it's
// being uploaded — a lightweight guard against running the wrong extraction prompt
// on a document, not a hard block: admin can still import here anyway (a filename
// can always be wrong).
export function CategoryMismatchWarning({
  detected,
  onImportAnyway,
  onCancel,
}: {
  detected: StructuredCategory
  onImportAnyway: () => void
  onCancel: () => void
}) {
  const { institutionId } = useParams<{ institutionId: string }>()

  return (
    <div className="flex flex-col gap-4 rounded-md border border-dashed border-border py-8 text-center">
      <TriangleAlert className="mx-auto size-8 text-muted-foreground/60" strokeWidth={1.5} />
      <p className="px-6 text-sm text-muted-foreground">
        This file&apos;s name looks like a <span className="font-medium text-foreground">{CATEGORY_LABELS[detected]}</span>{" "}
        document. Import it here anyway, or go to the right place?
      </p>
      <div className="flex justify-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Link href={`/admin/${institutionId}/${CATEGORY_PATHS[detected]}`}>
          <Button type="button" variant="outline" size="sm">
            {CATEGORY_ACTION_LABELS[detected]}
          </Button>
        </Link>
        <Button type="button" size="sm" onClick={onImportAnyway}>
          Import anyway
        </Button>
      </div>
    </div>
  )
}
