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
import { ClassPicker, type ClassPickerValue } from "@/components/features/admin/class-picker"

export function AddCourseDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { courseCode: string; courseTitle: string; academicClassId: string }) => Promise<void>
}) {
  const [courseCode, setCourseCode] = useState("")
  const [courseTitle, setCourseTitle] = useState("")
  const [classValue, setClassValue] = useState<ClassPickerValue | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next) {
      setCourseCode("")
      setCourseTitle("")
      setClassValue(null)
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!courseCode.trim() || !courseTitle.trim()) {
      setError("Give it a code and a title")
      return
    }
    if (!classValue) {
      setError("Pick which class this course belongs to")
      return
    }
    setPending(true)
    setError(null)
    try {
      await onSubmit({
        courseCode: courseCode.trim(),
        courseTitle: courseTitle.trim(),
        academicClassId: classValue.academicClassId,
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
            <DialogTitle>Add course</DialogTitle>
            <DialogDescription>Visible to every student in the class you pick below.</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="course-code">Course code</FieldLabel>
            <Input
              id="course-code"
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value)}
              placeholder="e.g. ACCT 108"
              autoFocus
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="course-title">Course title</FieldLabel>
            <Input
              id="course-title"
              value={courseTitle}
              onChange={(event) => setCourseTitle(event.target.value)}
              placeholder="e.g. Business Maths"
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel>Class</FieldLabel>
            <ClassPicker onChange={setClassValue} disabled={pending} />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding..." : "Add course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
