"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function toDateInputValue(epochMs: number) {
  const date = new Date(epochMs)
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${date.getUTCFullYear()}-${month}-${day}`
}

// Exam rows only expose title/date/notes here — activityType is always EXAM and
// priority is always CRITICAL for anything published through the Exams/Resit import
// or this edit dialog, so there's nothing to pick for either (see
// courseActivities.ts#importExamTimetable). notes carries venue/"Resit exam" as plain
// text, same as the import wrote it — editing it as one free field is consistent with
// that rather than splitting it back into structured pieces the schema doesn't have.
export function EditExamDialog({
  open,
  onOpenChange,
  exam,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  exam: { title: string; dueDate: number; notes?: string } | null
  onSubmit: (values: { title: string; dueDate: number; notes?: string }) => Promise<void>
}) {
  const [title, setTitle] = useState(exam?.title ?? "")
  const [dueDate, setDueDate] = useState(exam ? toDateInputValue(exam.dueDate) : "")
  const [notes, setNotes] = useState(exam?.notes ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next && exam) {
      setTitle(exam.title)
      setDueDate(toDateInputValue(exam.dueDate))
      setNotes(exam.notes ?? "")
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError("Give it a title")
      return
    }
    if (!dueDate) {
      setError("Pick a date")
      return
    }
    setPending(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        dueDate: new Date(dueDate).getTime(),
        notes: notes.trim() || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Edit exam</DialogTitle>
            <DialogDescription>Changes apply immediately.</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="edit-exam-title">Title</FieldLabel>
            <Input
              id="edit-exam-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-exam-date">Date</FieldLabel>
            <Input
              id="edit-exam-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-exam-notes">Notes (optional)</FieldLabel>
            <Input
              id="edit-exam-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Resit exam — CCB202"
              disabled={pending}
              className="h-10"
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
