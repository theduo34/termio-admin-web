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

export function AddActivityDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { title: string; description?: string; date: number }) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next) {
      setTitle("")
      setDescription("")
      setDate("")
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
            <DialogTitle>Add activity</DialogTitle>
            <DialogDescription>Published immediately — every student is notified.</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="activity-title">Title</FieldLabel>
            <Input
              id="activity-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Registration begins"
              autoFocus
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="activity-description">Description (optional)</FieldLabel>
            <Input
              id="activity-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short context, if useful"
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="activity-date">Date</FieldLabel>
            <Input
              id="activity-date"
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
              {pending ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
