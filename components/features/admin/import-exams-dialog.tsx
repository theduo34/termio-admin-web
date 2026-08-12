"use client"

import { useRef, useState } from "react"
import { useAction, useMutation } from "convex/react"
import { anyApi } from "convex/server"
import { Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ParsingStatus } from "@/components/features/admin/parsing-status"
import { CategoryMismatchWarning } from "@/components/features/admin/category-mismatch-warning"
import { detectCategoryFromFilename } from "@/lib/detectDocumentCategory"

type Stage = "upload" | "warning" | "parsing" | "review" | "importing"

type DraftExamRow = {
  key: string
  courseCode: string
  courseTitle: string
  classLabel: string
  examDate: string // yyyy-mm-dd, <input type="date"> format
  examTime: string // "HH:MM-HH:MM" 24h, or ""
  venue: string
  isResit: boolean
}

type ExtractedExamRow = {
  courseCode: string
  courseTitle: string
  classLabel?: string
  examDate: number
  examTime?: string
  venue?: string
  isResit: boolean
}

// UTC-getter round-trip, same convention as import-activities-dialog.tsx's
// toDateInputValue — Date.parse("yyyy-mm-dd") on the backend and new Date("yyyy-mm-dd")
// here both treat a bare date string as UTC midnight, so reading it back via UTC
// getters keeps this exact regardless of the browser's own timezone.
function toDateInputValue(epochMs: number) {
  const date = new Date(epochMs)
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${date.getUTCFullYear()}-${month}-${day}`
}

// Folds the row's own time-of-day (if any) into its date, in the same UTC-based frame
// toDateInputValue reads back from — courseActivities.dueDate is one timestamp, not a
// separate date+time pair, so this has to happen before publish, not after.
function combineDateAndTime(dateInput: string, timeRange: string): number {
  const base = new Date(dateInput).getTime()
  const match = /^(\d{2}):(\d{2})-/.exec(timeRange)
  if (!match) return base
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return base + (hours * 60 + minutes) * 60_000
}

// No ClassPicker/class-mapping step here, unlike import-timetable-dialog.tsx — an
// exam timetable's own "class" column is frequently under-specified (a resit's class
// often carries no level number at all, confirmed by reading the actual sample
// document), so forcing a single class per group would silently fail to resolve rows
// that belong to a different level of the same program. Rows instead resolve purely
// by courseCode against the whole semester's courses server-side (see
// courseActivities.ts#importExamTimetable) — this dialog stays a flat editable list,
// the same shape as import-activities-dialog.tsx, plus a resit toggle per row.
export function ImportExamsDialog({
  open,
  onOpenChange,
  categoryId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string
}) {
  const [stage, setStage] = useState<Stage>("upload")
  const [rows, setRows] = useState<DraftExamRow[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [mismatchCategory, setMismatchCategory] = useState<"timetable" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(anyApi.documentUploads.generateImportUploadUrl)
  const parseDocument = useAction(anyApi.documentImport.parseExamTimetable)
  const importExamTimetable = useMutation(anyApi.courseActivities.importExamTimetable)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setStage("upload")
      setRows([])
      setPendingFile(null)
      setMismatchCategory(null)
    }
    onOpenChange(next)
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    // Only warn against Teaching Timetable specifically — a generic/calendar-looking
    // filename isn't a strong enough signal to second-guess uploading it here.
    const detected = detectCategoryFromFilename(file.name)
    if (detected === "timetable") {
      setPendingFile(file)
      setMismatchCategory(detected)
      setStage("warning")
      return
    }
    void proceedWithFile(file)
  }

  async function proceedWithFile(file: File) {
    setStage("parsing")
    try {
      const uploadUrl = await generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!uploadResponse.ok) throw new Error("Upload failed")
      const { storageId } = await uploadResponse.json()

      const extracted: ExtractedExamRow[] = await parseDocument({ storageId })
      if (extracted.length === 0) {
        toast.error("Nothing extracted", {
          description: "The document didn't yield any recognizable exam rows.",
        })
        setStage("upload")
        return
      }

      setRows(
        extracted.map((row, index) => ({
          key: `${index}-${row.courseCode}`,
          courseCode: row.courseCode,
          courseTitle: row.courseTitle,
          classLabel: row.classLabel ?? "",
          examDate: toDateInputValue(row.examDate),
          examTime: row.examTime ?? "",
          venue: row.venue ?? "",
          isResit: row.isResit,
        }))
      )
      setStage("review")
    } catch (err) {
      toast.error("Couldn't read that document", {
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      })
      setStage("upload")
    }
  }

  function updateRow(key: string, patch: Partial<DraftExamRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key))
  }

  async function handleConfirm() {
    setStage("importing")
    try {
      const result = await importExamTimetable({
        categoryId,
        rows: rows.map((row) => ({
          courseCode: row.courseCode.trim(),
          courseTitle: row.courseTitle.trim(),
          examDate: combineDateAndTime(row.examDate, row.examTime),
          venue: row.venue.trim() || undefined,
          isResit: row.isResit,
        })),
      })
      if (result.unmatchedCourseCodes.length > 0) {
        toast.warning("Published with some skipped", {
          description: `${result.published} exam${result.published === 1 ? "" : "s"} published. Course code${
            result.unmatchedCourseCodes.length === 1 ? "" : "s"
          } not found (import Teaching Timetable first, or fix the code): ${result.unmatchedCourseCodes.join(", ")}.`,
        })
      } else {
        toast.success("Imported", {
          description: `${result.published} exam${result.published === 1 ? "" : "s"} published.`,
        })
      }
      handleOpenChange(false)
    } catch (err) {
      toast.error("Couldn't import", {
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      })
      setStage("review")
    }
  }

  const reviewing = stage === "review" || stage === "importing"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={reviewing ? "sm:max-w-[95vw] lg:max-w-4xl" : undefined}>
        <DialogHeader>
          <DialogTitle>Import exam timetable</DialogTitle>
          <DialogDescription>
            {reviewing
              ? "Review what was extracted before publishing — edit or remove anything that's wrong."
              : "Upload an exam or resit timetable PDF. It's read into a list you check before anything is published."}
          </DialogDescription>
        </DialogHeader>

        {stage === "upload" ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-10 text-center">
            <Upload className="size-8 text-muted-foreground/50" strokeWidth={1.5} />
            <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose a PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        ) : null}

        {stage === "warning" && mismatchCategory ? (
          <CategoryMismatchWarning
            detected={mismatchCategory}
            onCancel={() => {
              setPendingFile(null)
              setMismatchCategory(null)
              setStage("upload")
            }}
            onImportAnyway={() => {
              if (pendingFile) void proceedWithFile(pendingFile)
            }}
          />
        ) : null}

        {stage === "parsing" ? <ParsingStatus /> : null}

        {reviewing ? (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:flex-wrap"
              >
                <div className="flex flex-1 flex-col gap-2 sm:min-w-[220px]">
                  <div className="flex gap-2">
                    <Input
                      value={row.courseCode}
                      onChange={(event) => updateRow(row.key, { courseCode: event.target.value })}
                      disabled={stage === "importing"}
                      className="h-9 w-28 font-medium"
                      placeholder="Code"
                    />
                    <Input
                      value={row.courseTitle}
                      onChange={(event) => updateRow(row.key, { courseTitle: event.target.value })}
                      disabled={stage === "importing"}
                      className="h-9 flex-1"
                      placeholder="Title"
                    />
                  </div>
                  {row.classLabel ? (
                    <Input
                      value={row.classLabel}
                      onChange={(event) => updateRow(row.key, { classLabel: event.target.value })}
                      disabled={stage === "importing"}
                      className="h-8 text-xs text-muted-foreground"
                      placeholder="Class (context only)"
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={row.examDate}
                    onChange={(event) => updateRow(row.key, { examDate: event.target.value })}
                    disabled={stage === "importing"}
                    className="h-9 w-[150px]"
                  />
                  <Input
                    value={row.examTime}
                    onChange={(event) => updateRow(row.key, { examTime: event.target.value })}
                    placeholder="HH:MM-HH:MM"
                    disabled={stage === "importing"}
                    className="h-9 w-32"
                  />
                  <Input
                    value={row.venue}
                    onChange={(event) => updateRow(row.key, { venue: event.target.value })}
                    placeholder="Venue"
                    disabled={stage === "importing"}
                    className="h-9 w-24"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={row.isResit}
                      onChange={(event) => updateRow(row.key, { isResit: event.target.checked })}
                      disabled={stage === "importing"}
                    />
                    Resit
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={stage === "importing"}
                    onClick={() => removeRow(row.key)}
                    aria-label="Remove row"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {reviewing ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={stage === "importing"}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={rows.length === 0 || stage === "importing"}>
              {stage === "importing" ? "Publishing..." : `Publish ${rows.length} exam${rows.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
