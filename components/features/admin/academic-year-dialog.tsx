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

// yyyy-mm-dd, the <input type="date"> format — new Date("yyyy-mm-dd") and
// date.toISOString().slice(0, 10) both round-trip this exactly since the browser
// treats a bare date string as UTC midnight, same convention already established in
// import-activities-dialog.tsx's toDateInputValue.
function toDateInputValue(epochMs: number) {
  return new Date(epochMs).toISOString().slice(0, 10)
}

export function AcademicYearDialog({
  open,
  onOpenChange,
  initialValue,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue?: { title: string; startDate: number; endDate: number }
  onSubmit: (values: { title: string; startDate: number; endDate: number }) => Promise<void>
}) {
  const isEdit = initialValue !== undefined
  const [title, setTitle] = useState(initialValue?.title ?? "")
  const [startDate, setStartDate] = useState(initialValue ? toDateInputValue(initialValue.startDate) : "")
  const [endDate, setEndDate] = useState(initialValue ? toDateInputValue(initialValue.endDate) : "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next) {
      setTitle(initialValue?.title ?? "")
      setStartDate(initialValue ? toDateInputValue(initialValue.startDate) : "")
      setEndDate(initialValue ? toDateInputValue(initialValue.endDate) : "")
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError("Give it a title, e.g. 2026/2027")
      return
    }
    if (!startDate || !endDate) {
      setError("Set a start and end date")
      return
    }
    if (new Date(startDate).getTime() >= new Date(endDate).getTime()) {
      setError("The start date must be before the end date")
      return
    }
    setPending(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
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
            <DialogTitle>{isEdit ? "Edit academic year" : "New academic year"}</DialogTitle>
            <DialogDescription>Groups the two semesters that run within it.</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="academic-year-title">Title</FieldLabel>
            <Input
              id="academic-year-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. 2026/2027"
              autoFocus
              disabled={pending}
              className="h-10"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="academic-year-start">Start date</FieldLabel>
              <Input
                id="academic-year-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={pending}
                className="h-10"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="academic-year-end">End date</FieldLabel>
              <Input
                id="academic-year-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={pending}
                className="h-10"
              />
            </Field>
          </div>
          {error ? <FieldError>{error}</FieldError> : null}

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
