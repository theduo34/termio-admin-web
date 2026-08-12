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

type DraftActivity = {
  key: string
  title: string
  description: string
  date: string // yyyy-mm-dd, the <input type="date"> format
}

// Both Date.parse("yyyy-mm-dd") on the backend (documentImport.ts) and
// new Date("yyyy-mm-dd") here interpret a bare date string as UTC midnight per the
// spec — reading it back out via the UTC getters (not the local ones) keeps this
// round-trip exact regardless of which timezone the browser is in.
function toDateInputValue(epochMs: number) {
  const date = new Date(epochMs)
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${date.getUTCFullYear()}-${month}-${day}`
}

export function ImportActivitiesDialog({
  open,
  onOpenChange,
  categoryId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string
}) {
  const [stage, setStage] = useState<Stage>("upload")
  const [rows, setRows] = useState<DraftActivity[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [mismatchCategory, setMismatchCategory] = useState<"timetable" | "exam" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(anyApi.documentUploads.generateImportUploadUrl)
  const parseDocument = useAction(anyApi.documentImport.parseAcademicCalendar)
  const createActivities = useMutation(anyApi.semesterActivities.createSemesterActivitiesBulk)

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

    // A generic category accepts any calendar-shaped content by definition — only
    // warn when the filename points at one of the two *structured* pages instead
    // (Courses/Timetable, Exams), which a plain title/date/description row can't
    // properly hold.
    const detected = detectCategoryFromFilename(file.name)
    if (detected === "timetable" || detected === "exam") {
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

      const extracted: { title: string; description: string; date: number }[] = await parseDocument({ storageId })
      if (extracted.length === 0) {
        toast.error("Nothing extracted", {
          description: "The document didn't yield any rows with a usable date.",
        })
        setStage("upload")
        return
      }

      setRows(
        extracted.map((row, index) => ({
          key: `${index}-${row.title}`,
          title: row.title,
          description: row.description,
          date: toDateInputValue(row.date),
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

  function updateRow(key: string, patch: Partial<DraftActivity>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key))
  }

  async function handleConfirm() {
    setStage("importing")
    try {
      await createActivities({
        categoryId,
        activities: rows.map((row) => ({
          title: row.title.trim(),
          description: row.description.trim() || undefined,
          date: new Date(row.date).getTime(),
        })),
      })
      toast.success("Imported", {
        description: `${rows.length} ${rows.length === 1 ? "activity" : "activities"} added to this category.`,
      })
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
      <DialogContent className={reviewing ? "lg:max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>Import from document</DialogTitle>
          <DialogDescription>
            {reviewing
              ? "Review what was extracted before publishing — edit or remove anything that's wrong."
              : "Upload a PDF with dated activities (a calendar, deadlines list, or similar). It's read into a list you check before anything is published."}
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
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-start"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    value={row.title}
                    onChange={(event) => updateRow(row.key, { title: event.target.value })}
                    disabled={stage === "importing"}
                    className="h-9 font-medium"
                  />
                  <Input
                    value={row.description}
                    onChange={(event) => updateRow(row.key, { description: event.target.value })}
                    placeholder="Description (optional)"
                    disabled={stage === "importing"}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    type="date"
                    value={row.date}
                    onChange={(event) => updateRow(row.key, { date: event.target.value })}
                    disabled={stage === "importing"}
                    className="h-9 w-[150px]"
                  />
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
              {stage === "importing" ? "Publishing..." : `Publish ${rows.length} ${rows.length === 1 ? "activity" : "activities"}`}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
