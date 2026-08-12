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

// The edit counterpart to add-activity-dialog.tsx's create form — same field set and
// validation, pre-filled from the activity being edited rather than starting blank.
export function EditActivityDialog({
  open,
  onOpenChange,
  activity,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: { title: string; description?: string; date: number } | null
  onSubmit: (values: { title: string; description?: string; date: number }) => Promise<void>
}) {
  const [title, setTitle] = useState(activity?.title ?? "")
  const [description, setDescription] = useState(activity?.description ?? "")
  const [date, setDate] = useState(activity ? toDateInputValue(activity.date) : "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next && activity) {
      setTitle(activity.title)
      setDescription(activity.description ?? "")
      setDate(toDateInputValue(activity.date))
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
    if (!date) {
      setError("Pick a date")
      return
    }
    setPending(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(date).getTime(),
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
            <DialogTitle>Edit activity</DialogTitle>
            <DialogDescription>Changes apply immediately — no re-notification is sent.</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="edit-activity-title">Title</FieldLabel>
            <Input
              id="edit-activity-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-activity-description">Description (optional)</FieldLabel>
            <Input
              id="edit-activity-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short context, if useful"
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-activity-date">Date</FieldLabel>
            <Input
              id="edit-activity-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
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
