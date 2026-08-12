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

type CategoryKind = "general" | "exams"

const selectClassName =
  "h-10 w-full border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"

// Named presets, not a bare "General vs. Exams" toggle — each sets both the
// category's kind and (when the Name field is still empty) suggests a starting name,
// still fully editable afterward. Only two kinds actually exist on the backend (see
// activityCategories.ts's own comment on why: a plain title/date/description bucket
// vs. one that resolves exam rows against real courses) — "Teaching Timetable" and
// "Course Activities" are deliberately not offered here even though they're
// plausible-sounding category names, because neither has a real pipeline behind it
// in this system: Timetable creates whole courses/classes on its own Courses page,
// and there's no course-activity (assignment/quiz/project) import built at all yet.
// Offering them as options here would silently do nothing special, which is worse
// than not offering them.
const TYPE_PRESETS: { label: string; kind: CategoryKind }[] = [
  { label: "Semester Activities", kind: "general" },
  { label: "Academic Calendar", kind: "general" },
  { label: "Events & Deadlines", kind: "general" },
  { label: "Exams", kind: "exams" },
  { label: "Resit Exams", kind: "exams" },
]

// `kind` is only ever picked at creation — the Type selector below doesn't render in
// edit mode at all, and callers must not spread this payload's `kind` field into an
// update mutation (activityCategories.ts#updateCategory doesn't accept it; kind is
// immutable after creation, see that mutation's own comment). It's still always
// present on the payload for a simpler single callback shape — edit-mode callers just
// don't use it.
export function CategoryDialog({
  open,
  onOpenChange,
  initialValue,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue?: { name: string; description?: string }
  onSubmit: (values: { name: string; description?: string; kind: CategoryKind }) => Promise<void>
}) {
  const isEdit = initialValue !== undefined
  const [name, setName] = useState(initialValue?.name ?? "")
  const [description, setDescription] = useState(initialValue?.description ?? "")
  const [presetIndex, setPresetIndex] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(initialValue?.name ?? "")
      setDescription(initialValue?.description ?? "")
      setPresetIndex(0)
      setError(null)
    }
    onOpenChange(next)
  }

  function handlePresetChange(index: number) {
    setPresetIndex(index)
    if (!name.trim()) {
      setName(TYPE_PRESETS[index].label)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Give it a name, e.g. Academic Calendar")
      return
    }
    setPending(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined, kind: TYPE_PRESETS[presetIndex].kind })
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
            <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              A bucket for activities you publish under this semester — name it however makes sense to you.
            </DialogDescription>
          </DialogHeader>

          {!isEdit ? (
            <Field>
              <FieldLabel htmlFor="category-type">Type</FieldLabel>
              <select
                id="category-type"
                value={presetIndex}
                disabled={pending}
                onChange={(event) => handlePresetChange(Number(event.target.value))}
                className={selectClassName}
              >
                {TYPE_PRESETS.map((preset, index) => (
                  <option key={preset.label} value={index}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {TYPE_PRESETS[presetIndex].kind === "exams"
                  ? "Imports match courses by code, not plain title/date rows — this can't change after creating."
                  : "Plain title/date/description activities."}
              </p>
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="category-name">Name</FieldLabel>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Academic Calendar"
              autoFocus={isEdit}
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="category-description">Description (optional)</FieldLabel>
            <Input
              id="category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What kind of activities go here"
              disabled={pending}
              className="h-10"
            />
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
