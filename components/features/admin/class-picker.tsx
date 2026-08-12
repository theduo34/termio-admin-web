"use client"

import { useEffect, useState } from "react"
import { useQuery } from "convex/react"
import { anyApi } from "convex/server"

import { cn } from "@/lib/utils"

type Faculty = { _id: string; name: string }
type Department = { _id: string; name: string }
type Program = { _id: string; name: string }
type AcademicClass = { _id: string; level: number; session: "REGULAR" | "WEEKEND" }
type Division = { _id: string; label: string }

export type ClassPickerValue = { academicClassId: string; divisionId: string | undefined }

const selectClassName = cn(
  "h-8 min-w-0 flex-1 border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50",
  "dark:bg-input/30"
)

// Faculty -> Department -> Program -> Class -> (optional) Division, the same cascade
// hierarchy-manager.tsx already drills through as browsable columns — reused here as
// five compact native selects since this is a one-off "map this to a class" picker,
// not a management surface of its own. Every query it calls is already open to any
// signed-in caller (see academicStructure.ts), so no new backend surface for this.
// Reused by both add-course-dialog.tsx (one course) and import-timetable-dialog.tsx
// (one picker per detected class section) — the exact cascade logic isn't worth a
// second copy either place.
export function ClassPicker({
  onChange,
  disabled,
}: {
  onChange: (value: ClassPickerValue | null) => void
  disabled?: boolean
}) {
  const [facultyId, setFacultyId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [programId, setProgramId] = useState("")
  const [academicClassId, setAcademicClassId] = useState("")
  const [divisionId, setDivisionId] = useState("")

  const faculties = useQuery(anyApi.academicStructure.listFaculties) as Faculty[] | undefined
  const departments = useQuery(
    anyApi.academicStructure.listDepartmentsByFaculty,
    facultyId ? { facultyId } : "skip"
  ) as Department[] | undefined
  const programs = useQuery(
    anyApi.academicStructure.listProgramsByDepartment,
    departmentId ? { departmentId } : "skip"
  ) as Program[] | undefined
  const classes = useQuery(
    anyApi.academicStructure.listClassesByProgram,
    programId ? { programId } : "skip"
  ) as AcademicClass[] | undefined
  const divisions = useQuery(
    anyApi.academicStructure.listDivisionsByClass,
    academicClassId ? { academicClassId } : "skip"
  ) as Division[] | undefined

  useEffect(() => {
    onChange(academicClassId ? { academicClassId, divisionId: divisionId || undefined } : null)
    // onChange intentionally excluded — callers pass a fresh closure each render, and
    // depending on it here would refire on every parent render, not just on selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicClassId, divisionId])

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={facultyId}
        disabled={disabled}
        onChange={(event) => {
          setFacultyId(event.target.value)
          setDepartmentId("")
          setProgramId("")
          setAcademicClassId("")
          setDivisionId("")
        }}
        className={selectClassName}
      >
        <option value="">Faculty…</option>
        {faculties?.map((f) => (
          <option key={f._id} value={f._id}>
            {f.name}
          </option>
        ))}
      </select>

      <select
        value={departmentId}
        disabled={disabled || !facultyId}
        onChange={(event) => {
          setDepartmentId(event.target.value)
          setProgramId("")
          setAcademicClassId("")
          setDivisionId("")
        }}
        className={selectClassName}
      >
        <option value="">Department…</option>
        {departments?.map((d) => (
          <option key={d._id} value={d._id}>
            {d.name}
          </option>
        ))}
      </select>

      <select
        value={programId}
        disabled={disabled || !departmentId}
        onChange={(event) => {
          setProgramId(event.target.value)
          setAcademicClassId("")
          setDivisionId("")
        }}
        className={selectClassName}
      >
        <option value="">Program…</option>
        {programs?.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={academicClassId}
        disabled={disabled || !programId}
        onChange={(event) => {
          setAcademicClassId(event.target.value)
          setDivisionId("")
        }}
        className={selectClassName}
      >
        <option value="">Level / Session…</option>
        {classes?.map((c) => (
          <option key={c._id} value={c._id}>
            {`Level ${c.level} · ${c.session === "REGULAR" ? "Regular" : "Weekend"}`}
          </option>
        ))}
      </select>

      <select
        value={divisionId}
        disabled={disabled || !academicClassId || divisions?.length === 0}
        onChange={(event) => setDivisionId(event.target.value)}
        className={selectClassName}
      >
        <option value="">Undivided</option>
        {divisions?.map((d) => (
          <option key={d._id} value={d._id}>
            Division {d.label}
          </option>
        ))}
      </select>
    </div>
  )
}
