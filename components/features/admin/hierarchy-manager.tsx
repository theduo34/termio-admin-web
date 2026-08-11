"use client"

import { useState, type ReactNode } from "react"
import { useQuery, useMutation } from "convex/react"
import { anyApi } from "convex/server"
import { toast } from "sonner"
import {
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  MoreVertical,
  Building2,
  Library,
  GraduationCap,
  Layers,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { NameDialog } from "@/components/shared/name-dialog"

type Faculty = { _id: string; name: string }
type Department = { _id: string; name: string }
type Program = { _id: string; name: string }
type AcademicClass = { _id: string; level: number; session: "REGULAR" | "WEEKEND" }
type Division = { _id: string; label: string }

// ---------------------------------------------------------------------------
// Presentational shell shared by every level of the hierarchy — a column of
// rows the admin drills into left to right. Faculty -> Department -> Program
// -> Class -> Division, each one a thin client of the same shape.
// ---------------------------------------------------------------------------

function HierarchyColumn({
  icon: IconComponent,
  title,
  count,
  onAdd,
  addDisabled,
  addLabel,
  children,
}: {
  icon: LucideIcon
  title: string
  count?: number
  onAdd?: () => void
  addDisabled?: boolean
  addLabel: string
  children: ReactNode
}) {
  return (
    <div className="flex w-[272px] shrink-0 snap-start flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <IconComponent className="size-4" strokeWidth={2.25} />
          </div>
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{title}</span>
            {count !== undefined ? (
              <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
            ) : null}
          </div>
        </div>
        {onAdd ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onAdd}
            disabled={addDisabled}
            aria-label={addLabel}
            title={addLabel}
          >
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">{children}</div>
    </div>
  )
}

function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 p-1">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-11 w-full rounded-md" />
      ))}
    </div>
  )
}

function ColumnEmptyState({ icon: IconComponent, title, message }: { icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <IconComponent className="size-7 text-muted-foreground/50" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

function HierarchyRow({
  label,
  sublabel,
  selected,
  selectable = true,
  onSelect,
  onRename,
  onDelete,
}: {
  label: string
  sublabel?: string
  selected?: boolean
  selectable?: boolean
  onSelect?: () => void
  onRename?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={
        selectable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect?.()
              }
            }
          : undefined
      }
      className={cn(
        "group/row flex items-center gap-1 rounded-md px-2.5 py-2.5 outline-none transition-colors",
        selectable && "cursor-pointer",
        selected ? "bg-primary/8 text-primary" : "text-foreground hover:bg-muted"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", selected ? "font-semibold text-primary" : "font-medium text-foreground")}>
          {label}
        </p>
        {sublabel ? <p className="truncate text-xs text-muted-foreground">{sublabel}</p> : null}
      </div>

      {(onRename || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-background hover:text-foreground",
              "opacity-0 group-hover/row:opacity-100 data-[popup-open]:opacity-100"
            )}
            aria-label="Row actions"
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]" onClick={(event) => event.stopPropagation()}>
            {onRename ? (
              <DropdownMenuItem className="gap-2.5" onClick={onRename}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
            ) : null}
            {onDelete ? (
              <DropdownMenuItem variant="destructive" className="gap-2.5" onClick={onDelete}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {selectable ? (
        <ChevronRight
          className={cn("size-3.5 shrink-0", selected ? "text-primary" : "text-muted-foreground/40")}
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create/rename dialog for an academicClass — Level (number) + Session
// (Regular/Weekend), no free-text name.
// ---------------------------------------------------------------------------

function ClassDialog({
  open,
  onOpenChange,
  title,
  initialLevel = 100,
  initialSession = "REGULAR",
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialLevel?: number
  initialSession?: "REGULAR" | "WEEKEND"
  onSubmit: (level: number, session: "REGULAR" | "WEEKEND") => Promise<void>
}) {
  const [level, setLevel] = useState(initialLevel)
  const [session, setSession] = useState<"REGULAR" | "WEEKEND">(initialSession)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next) {
      setLevel(initialLevel)
      setSession(initialSession)
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!Number.isInteger(level) || level <= 0) {
      setError("Enter a valid level, e.g. 100")
      return
    }
    setPending(true)
    setError(null)
    try {
      await onSubmit(level, session)
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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>A class is a Level + Session combination within this program.</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="hierarchy-level">Level</FieldLabel>
            <Input
              id="hierarchy-level"
              type="number"
              step={100}
              min={100}
              value={level}
              onChange={(event) => setLevel(Number(event.target.value))}
              disabled={pending}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel>Session</FieldLabel>
            <div className="flex gap-2">
              {(["REGULAR", "WEEKEND"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={pending}
                  onClick={() => setSession(option)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize outline-none transition-colors",
                    session === option
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {option.toLowerCase()}
                </button>
              ))}
            </div>
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

// ---------------------------------------------------------------------------

type NameDialogState = {
  mode: "create" | "rename"
  level: "faculty" | "department" | "program" | "division"
  id?: string
  initialValue?: string
} | null

type ClassDialogState = {
  mode: "create" | "rename"
  id?: string
  initialLevel?: number
  initialSession?: "REGULAR" | "WEEKEND"
} | null

type DeleteDialogState = {
  level: "faculty" | "department" | "program" | "class" | "division"
  id: string
  name: string
} | null

export function HierarchyManager() {
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null)
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [selectedClass, setSelectedClass] = useState<AcademicClass | null>(null)

  const [nameDialog, setNameDialog] = useState<NameDialogState>(null)
  const [classDialog, setClassDialog] = useState<ClassDialogState>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null)

  const faculties = useQuery(anyApi.academicStructure.listFaculties)
  const departments = useQuery(
    anyApi.academicStructure.listDepartmentsByFaculty,
    selectedFaculty ? { facultyId: selectedFaculty._id } : "skip"
  )
  const programs = useQuery(
    anyApi.academicStructure.listProgramsByDepartment,
    selectedDept ? { departmentId: selectedDept._id } : "skip"
  )
  const classes = useQuery(
    anyApi.academicStructure.listClassesByProgram,
    selectedProgram ? { programId: selectedProgram._id } : "skip"
  )
  const divisions = useQuery(
    anyApi.academicStructure.listDivisionsByClass,
    selectedClass ? { academicClassId: selectedClass._id } : "skip"
  )

  const createFaculty = useMutation(anyApi.academicStructure.createFaculty)
  const updateFaculty = useMutation(anyApi.academicStructure.updateFaculty)
  const removeFaculty = useMutation(anyApi.academicStructure.removeFaculty)
  const createDepartment = useMutation(anyApi.academicStructure.createDepartment)
  const updateDepartment = useMutation(anyApi.academicStructure.updateDepartment)
  const removeDepartment = useMutation(anyApi.academicStructure.removeDepartment)
  const createProgram = useMutation(anyApi.academicStructure.createProgram)
  const updateProgram = useMutation(anyApi.academicStructure.updateProgram)
  const removeProgram = useMutation(anyApi.academicStructure.removeProgram)
  const createAcademicClass = useMutation(anyApi.academicStructure.createAcademicClass)
  const updateAcademicClass = useMutation(anyApi.academicStructure.updateAcademicClass)
  const removeAcademicClass = useMutation(anyApi.academicStructure.removeAcademicClass)
  const createDivision = useMutation(anyApi.academicStructure.createDivision)
  const updateDivision = useMutation(anyApi.academicStructure.updateDivision)
  const removeDivision = useMutation(anyApi.academicStructure.removeDivision)

  function selectFaculty(faculty: Faculty) {
    setSelectedFaculty(faculty)
    setSelectedDept(null)
    setSelectedProgram(null)
    setSelectedClass(null)
  }
  function selectDept(department: Department) {
    setSelectedDept(department)
    setSelectedProgram(null)
    setSelectedClass(null)
  }
  function selectProgram(program: Program) {
    setSelectedProgram(program)
    setSelectedClass(null)
  }
  function selectClass(academicClass: AcademicClass) {
    setSelectedClass(academicClass)
  }

  async function handleDelete() {
    if (!deleteDialog) return
    try {
      switch (deleteDialog.level) {
        case "faculty":
          await removeFaculty({ facultyId: deleteDialog.id })
          if (selectedFaculty?._id === deleteDialog.id) {
            setSelectedFaculty(null)
            setSelectedDept(null)
            setSelectedProgram(null)
            setSelectedClass(null)
          }
          break
        case "department":
          await removeDepartment({ departmentId: deleteDialog.id })
          if (selectedDept?._id === deleteDialog.id) {
            setSelectedDept(null)
            setSelectedProgram(null)
            setSelectedClass(null)
          }
          break
        case "program":
          await removeProgram({ programId: deleteDialog.id })
          if (selectedProgram?._id === deleteDialog.id) {
            setSelectedProgram(null)
            setSelectedClass(null)
          }
          break
        case "class":
          await removeAcademicClass({ academicClassId: deleteDialog.id })
          if (selectedClass?._id === deleteDialog.id) setSelectedClass(null)
          break
        case "division":
          await removeDivision({ divisionId: deleteDialog.id })
          break
      }
      toast.success("Deleted", {
        description: `${deleteDialog.name} has been removed.`,
      })
    } catch (err) {
      toast.error("Couldn't delete", {
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      })
      throw err
    }
  }

  const breadcrumb = [selectedFaculty?.name, selectedDept?.name, selectedProgram?.name, selectedClass ? `Level ${selectedClass.level} · ${selectedClass.session === "REGULAR" ? "Regular" : "Weekend"}` : null].filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {breadcrumb.length > 0
          ? breadcrumb.join(" / ")
          : "Institution / Faculty / Department / Program / Class / Division"}
      </p>

      <div className="no-scrollbar flex gap-4 overflow-x-auto snap-x">
        <HierarchyColumn icon={Building2} title="Faculties" count={faculties?.length} addLabel="Add faculty" onAdd={() => setNameDialog({ mode: "create", level: "faculty" })}>
          {faculties === undefined ? (
            <ColumnSkeleton />
          ) : faculties.length === 0 ? (
            <ColumnEmptyState icon={Building2} title="No faculties yet" message="Add the first one to get started." />
          ) : (
            faculties.map((f: Faculty) => (
              <HierarchyRow
                key={f._id}
                label={f.name}
                selected={selectedFaculty?._id === f._id}
                onSelect={() => selectFaculty(f)}
                onRename={() => setNameDialog({ mode: "rename", level: "faculty", id: f._id, initialValue: f.name })}
                onDelete={() => setDeleteDialog({ level: "faculty", id: f._id, name: f.name })}
              />
            ))
          )}
        </HierarchyColumn>

        <HierarchyColumn
          icon={Library}
          title="Departments"
          count={selectedFaculty ? departments?.length : undefined}
          addLabel="Add department"
          addDisabled={!selectedFaculty}
          onAdd={() => setNameDialog({ mode: "create", level: "department" })}
        >
          {!selectedFaculty ? (
            <ColumnEmptyState icon={Library} title="Select a faculty" message="Choose a faculty on the left." />
          ) : departments === undefined ? (
            <ColumnSkeleton />
          ) : departments.length === 0 ? (
            <ColumnEmptyState icon={Library} title="No departments yet" message="Add the first one to get started." />
          ) : (
            departments.map((d: Department) => (
              <HierarchyRow
                key={d._id}
                label={d.name}
                selected={selectedDept?._id === d._id}
                onSelect={() => selectDept(d)}
                onRename={() => setNameDialog({ mode: "rename", level: "department", id: d._id, initialValue: d.name })}
                onDelete={() => setDeleteDialog({ level: "department", id: d._id, name: d.name })}
              />
            ))
          )}
        </HierarchyColumn>

        <HierarchyColumn
          icon={GraduationCap}
          title="Programs"
          count={selectedDept ? programs?.length : undefined}
          addLabel="Add program"
          addDisabled={!selectedDept}
          onAdd={() => setNameDialog({ mode: "create", level: "program" })}
        >
          {!selectedDept ? (
            <ColumnEmptyState icon={GraduationCap} title="Select a department" message="Choose a department on the left." />
          ) : programs === undefined ? (
            <ColumnSkeleton />
          ) : programs.length === 0 ? (
            <ColumnEmptyState icon={GraduationCap} title="No programs yet" message="Add the first one to get started." />
          ) : (
            programs.map((p: Program) => (
              <HierarchyRow
                key={p._id}
                label={p.name}
                selected={selectedProgram?._id === p._id}
                onSelect={() => selectProgram(p)}
                onRename={() => setNameDialog({ mode: "rename", level: "program", id: p._id, initialValue: p.name })}
                onDelete={() => setDeleteDialog({ level: "program", id: p._id, name: p.name })}
              />
            ))
          )}
        </HierarchyColumn>

        <HierarchyColumn
          icon={Layers}
          title="Classes"
          count={selectedProgram ? classes?.length : undefined}
          addLabel="Add class"
          addDisabled={!selectedProgram}
          onAdd={() => setClassDialog({ mode: "create" })}
        >
          {!selectedProgram ? (
            <ColumnEmptyState icon={Layers} title="Select a program" message="Choose a program on the left." />
          ) : classes === undefined ? (
            <ColumnSkeleton />
          ) : classes.length === 0 ? (
            <ColumnEmptyState icon={Layers} title="No classes yet" message="Add a Level + Session to get started." />
          ) : (
            classes.map((c: AcademicClass) => (
              <HierarchyRow
                key={c._id}
                label={`Level ${c.level}`}
                sublabel={c.session === "REGULAR" ? "Regular" : "Weekend"}
                selected={selectedClass?._id === c._id}
                onSelect={() => selectClass(c)}
                onRename={() => setClassDialog({ mode: "rename", id: c._id, initialLevel: c.level, initialSession: c.session })}
                onDelete={() => setDeleteDialog({ level: "class", id: c._id, name: `Level ${c.level} (${c.session === "REGULAR" ? "Regular" : "Weekend"})` })}
              />
            ))
          )}
        </HierarchyColumn>

        <HierarchyColumn
          icon={Users}
          title="Divisions"
          count={selectedClass ? divisions?.length : undefined}
          addLabel="Add division"
          addDisabled={!selectedClass}
          onAdd={() => setNameDialog({ mode: "create", level: "division" })}
        >
          {!selectedClass ? (
            <ColumnEmptyState icon={Users} title="Select a class" message="Choose a class on the left." />
          ) : divisions === undefined ? (
            <ColumnSkeleton />
          ) : divisions.length === 0 ? (
            <ColumnEmptyState icon={Users} title="No divisions" message="Optional — most classes stay undivided." />
          ) : (
            divisions.map((d: Division) => (
              <HierarchyRow
                key={d._id}
                label={d.label}
                selectable={false}
                onRename={() => setNameDialog({ mode: "rename", level: "division", id: d._id, initialValue: d.label })}
                onDelete={() => setDeleteDialog({ level: "division", id: d._id, name: d.label })}
              />
            ))
          )}
        </HierarchyColumn>
      </div>

      {/* Faculty / Department / Program / Division — name-only create/rename */}
      <NameDialog
        open={nameDialog !== null}
        onOpenChange={(open) => !open && setNameDialog(null)}
        title={
          nameDialog
            ? `${nameDialog.mode === "create" ? "New" : "Rename"} ${nameDialog.level}`
            : ""
        }
        description={
          nameDialog?.mode === "create"
            ? `Add a new ${nameDialog.level} to the hierarchy.`
            : "Update the name shown to students."
        }
        fieldLabel="Name"
        placeholder={nameDialog?.level === "division" ? "e.g. A" : "e.g. Faculty of Engineering"}
        initialValue={nameDialog?.initialValue}
        onSubmit={async (value) => {
          if (!nameDialog) return
          if (nameDialog.mode === "create") {
            if (nameDialog.level === "faculty") await createFaculty({ name: value })
            if (nameDialog.level === "department" && selectedFaculty) await createDepartment({ facultyId: selectedFaculty._id, name: value })
            if (nameDialog.level === "program" && selectedDept) await createProgram({ departmentId: selectedDept._id, name: value })
            if (nameDialog.level === "division" && selectedClass) await createDivision({ academicClassId: selectedClass._id, label: value })
          } else if (nameDialog.id) {
            if (nameDialog.level === "faculty") await updateFaculty({ facultyId: nameDialog.id, name: value })
            if (nameDialog.level === "department") await updateDepartment({ departmentId: nameDialog.id, name: value })
            if (nameDialog.level === "program") await updateProgram({ programId: nameDialog.id, name: value })
            if (nameDialog.level === "division") await updateDivision({ divisionId: nameDialog.id, label: value })
          }
          if (nameDialog.mode === "create") {
            toast.success("Added", { description: `"${value}" was added to the hierarchy.` })
          } else {
            toast.success("Saved", { description: `Renamed to "${value}".` })
          }
        }}
      />

      {/* Class — Level + Session create/rename */}
      <ClassDialog
        open={classDialog !== null}
        onOpenChange={(open) => !open && setClassDialog(null)}
        title={classDialog?.mode === "create" ? "New class" : "Edit class"}
        initialLevel={classDialog?.initialLevel}
        initialSession={classDialog?.initialSession}
        onSubmit={async (level, session) => {
          if (!classDialog) return
          if (classDialog.mode === "create" && selectedProgram) {
            await createAcademicClass({ programId: selectedProgram._id, level, session })
          } else if (classDialog.id) {
            await updateAcademicClass({ academicClassId: classDialog.id, level, session })
          }
          if (classDialog.mode === "create") {
            toast.success("Added", { description: `Level ${level} (${session === "REGULAR" ? "Regular" : "Weekend"}) was added.` })
          } else {
            toast.success("Saved", { description: "The class was updated." })
          }
        }}
      />

      <ConfirmDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title={`Delete ${deleteDialog?.name ?? ""}?`}
        description="This can't be undone. Anything nested underneath must be removed first."
        pendingLabel="Deleting..."
        onConfirm={handleDelete}
      />
    </div>
  )
}
