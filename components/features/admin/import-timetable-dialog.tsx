"use client"

import { useRef, useState } from "react"
import { useAction, useMutation } from "convex/react"
import { anyApi } from "convex/server"
import { Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
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
import { ClassPicker, type ClassPickerValue } from "@/components/features/admin/class-picker"
import { ParsingStatus } from "@/components/features/admin/parsing-status"
import { CategoryMismatchWarning } from "@/components/features/admin/category-mismatch-warning"
import { detectCategoryFromFilename } from "@/lib/detectDocumentCategory"

type Stage = "upload" | "warning" | "parsing" | "review" | "importing"

type DraftRow = {
  key: string
  courseCode: string
  courseTitle: string
  lecturer: string
  day: string
  startTime: string
  endTime: string
  venue: string
}

type DraftGroup = {
  key: string
  classLabel: string
  mapping: ClassPickerValue | null
  rows: DraftRow[]
}

type ExtractedRow = {
  classLabel: string
  day: string
  courseCode: string
  courseTitle: string
  lecturer?: string
  startTime: string
  endTime: string
  venue?: string
}

const cellInputClassName = "h-8 min-w-[88px] px-1.5 text-xs"

// Structurally the same stage machine as import-activities-dialog.tsx (upload ->
// parsing -> review -> importing), extended with a grouping step: a timetable document
// has one section per academic class, and every detected class has to be mapped to a
// real academicClass (via ClassPicker) before its rows can be published — unlike the
// academic calendar import, which publishes straight into one already-selected
// semester with no per-row destination ambiguity.
export function ImportTimetableDialog({
  open,
  onOpenChange,
  semesterId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesterId: string
}) {
  const [stage, setStage] = useState<Stage>("upload")
  const [groups, setGroups] = useState<DraftGroup[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [mismatchCategory, setMismatchCategory] = useState<"exam" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(anyApi.documentUploads.generateImportUploadUrl)
  const parseDocument = useAction(anyApi.documentImport.parseCourseTimetable)
  const importTimetable = useMutation(anyApi.courses.importCourseTimetable)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setStage("upload")
      setGroups([])
      setPendingFile(null)
      setMismatchCategory(null)
    }
    onOpenChange(next)
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    // Only warn against Exams specifically — a generic/calendar-looking filename
    // isn't a strong enough signal to second-guess uploading it here.
    const detected = detectCategoryFromFilename(file.name)
    if (detected === "exam") {
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

      const extracted: ExtractedRow[] = await parseDocument({ storageId })
      if (extracted.length === 0) {
        toast.error("Nothing extracted", {
          description: "The document didn't yield any recognizable course slots.",
        })
        setStage("upload")
        return
      }

      const byLabel = new Map<string, DraftGroup>()
      extracted.forEach((row, index) => {
        const group = byLabel.get(row.classLabel) ?? {
          key: row.classLabel,
          classLabel: row.classLabel,
          mapping: null,
          rows: [],
        }
        group.rows.push({
          key: `${index}`,
          courseCode: row.courseCode,
          courseTitle: row.courseTitle,
          lecturer: row.lecturer ?? "",
          day: row.day,
          startTime: row.startTime,
          endTime: row.endTime,
          venue: row.venue ?? "",
        })
        byLabel.set(row.classLabel, group)
      })

      setGroups(Array.from(byLabel.values()))
      setStage("review")
    } catch (err) {
      toast.error("Couldn't read that document", {
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      })
      setStage("upload")
    }
  }

  function updateGroupMapping(groupKey: string, mapping: ClassPickerValue | null) {
    setGroups((current) => current.map((g) => (g.key === groupKey ? { ...g, mapping } : g)))
  }

  function removeGroup(groupKey: string) {
    setGroups((current) => current.filter((g) => g.key !== groupKey))
  }

  function updateRow(groupKey: string, rowKey: string, patch: Partial<DraftRow>) {
    setGroups((current) =>
      current.map((g) =>
        g.key === groupKey
          ? { ...g, rows: g.rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) }
          : g
      )
    )
  }

  function removeRow(groupKey: string, rowKey: string) {
    setGroups((current) =>
      current.map((g) => (g.key === groupKey ? { ...g, rows: g.rows.filter((r) => r.key !== rowKey) } : g))
    )
  }

  const publishableGroups = groups.filter((g) => g.rows.length > 0)
  const canPublish = publishableGroups.length > 0 && publishableGroups.every((g) => g.mapping !== null)
  const totalRows = publishableGroups.reduce((sum, g) => sum + g.rows.length, 0)

  async function handleConfirm() {
    if (!canPublish) return
    setStage("importing")
    try {
      const results = await Promise.all(
        publishableGroups.map((group) =>
          importTimetable({
            semesterId,
            academicClassId: group.mapping!.academicClassId,
            divisionId: group.mapping!.divisionId,
            rows: group.rows.map((row) => ({
              courseCode: row.courseCode.trim(),
              courseTitle: row.courseTitle.trim(),
              lecturer: row.lecturer.trim() || undefined,
              day: row.day.trim().toUpperCase(),
              startTime: row.startTime.trim(),
              endTime: row.endTime.trim(),
              venue: row.venue.trim() || undefined,
            })),
          })
        )
      )
      const coursesCreated = results.reduce((sum, r) => sum + r.coursesCreated, 0)
      const sectionsWritten = results.reduce((sum, r) => sum + r.sectionsWritten, 0)
      toast.success("Imported", {
        description: `${coursesCreated} new course${coursesCreated === 1 ? "" : "s"}, ${sectionsWritten} schedule row${
          sectionsWritten === 1 ? "" : "s"
        } published across ${publishableGroups.length} class${publishableGroups.length === 1 ? "" : "es"}.`,
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
      <DialogContent className={reviewing ? "sm:max-w-[95vw] lg:max-w-5xl" : undefined}>
        <DialogHeader>
          <DialogTitle>Import timetable</DialogTitle>
          <DialogDescription>
            {reviewing
              ? "Map each detected class to a real class, then review the rows before anything is published."
              : "Upload a teaching timetable PDF. It's read and grouped by class before anything is published."}
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
          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">{group.classLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.rows.length} row{group.rows.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    disabled={stage === "importing"}
                    onClick={() => removeGroup(group.key)}
                  >
                    <Trash2 className="size-3.5" />
                    Remove class
                  </Button>
                </div>

                <ClassPicker
                  disabled={stage === "importing"}
                  onChange={(mapping) => updateGroupMapping(group.key, mapping)}
                />
                {group.mapping === null ? (
                  <p className="text-xs text-destructive">Map this class before publishing.</p>
                ) : null}

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="pb-1 pr-2 font-medium">Code</th>
                        <th className="pb-1 pr-2 font-medium">Title</th>
                        <th className="pb-1 pr-2 font-medium">Lecturer</th>
                        <th className="pb-1 pr-2 font-medium">Day</th>
                        <th className="pb-1 pr-2 font-medium">Start</th>
                        <th className="pb-1 pr-2 font-medium">End</th>
                        <th className="pb-1 pr-2 font-medium">Venue</th>
                        <th className="pb-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.key}>
                          <td className="p-0.5">
                            <Input
                              value={row.courseCode}
                              onChange={(e) => updateRow(group.key, row.key, { courseCode: e.target.value })}
                              disabled={stage === "importing"}
                              className={cn(cellInputClassName, "w-24 font-medium")}
                            />
                          </td>
                          <td className="p-0.5">
                            <Input
                              value={row.courseTitle}
                              onChange={(e) => updateRow(group.key, row.key, { courseTitle: e.target.value })}
                              disabled={stage === "importing"}
                              className={cn(cellInputClassName, "w-40")}
                            />
                          </td>
                          <td className="p-0.5">
                            <Input
                              value={row.lecturer}
                              onChange={(e) => updateRow(group.key, row.key, { lecturer: e.target.value })}
                              placeholder="—"
                              disabled={stage === "importing"}
                              className={cn(cellInputClassName, "w-32")}
                            />
                          </td>
                          <td className="p-0.5">
                            <Input
                              value={row.day}
                              onChange={(e) => updateRow(group.key, row.key, { day: e.target.value })}
                              disabled={stage === "importing"}
                              className={cn(cellInputClassName, "w-24")}
                            />
                          </td>
                          <td className="p-0.5">
                            <Input
                              value={row.startTime}
                              onChange={(e) => updateRow(group.key, row.key, { startTime: e.target.value })}
                              disabled={stage === "importing"}
                              className={cn(cellInputClassName, "w-16")}
                            />
                          </td>
                          <td className="p-0.5">
                            <Input
                              value={row.endTime}
                              onChange={(e) => updateRow(group.key, row.key, { endTime: e.target.value })}
                              disabled={stage === "importing"}
                              className={cn(cellInputClassName, "w-16")}
                            />
                          </td>
                          <td className="p-0.5">
                            <Input
                              value={row.venue}
                              onChange={(e) => updateRow(group.key, row.key, { venue: e.target.value })}
                              placeholder="—"
                              disabled={stage === "importing"}
                              className={cn(cellInputClassName, "w-20")}
                            />
                          </td>
                          <td className="p-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={stage === "importing"}
                              onClick={() => removeRow(group.key, row.key)}
                              aria-label="Remove row"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
            <Button type="button" onClick={() => void handleConfirm()} disabled={!canPublish || stage === "importing"}>
              {stage === "importing"
                ? "Publishing..."
                : `Publish ${totalRows} row${totalRows === 1 ? "" : "s"} across ${publishableGroups.length} class${
                    publishableGroups.length === 1 ? "" : "es"
                  }`}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
