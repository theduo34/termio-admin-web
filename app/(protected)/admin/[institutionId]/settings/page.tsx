"use client"

import { useRef, useState, type ReactNode } from "react"
import { useMutation, useQuery, useConvexAuth } from "convex/react"
import { anyApi } from "convex/server"
import { toast } from "sonner"
import { ChevronRight } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { NameDialog } from "@/components/shared/name-dialog"
import { cn } from "@/lib/utils"

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

function SettingsSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</h2>
      <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">{children}</div>
    </div>
  )
}

function SettingsRow({
  title,
  subtitle,
  onClick,
  trailing,
}: {
  title: string
  subtitle?: ReactNode
  onClick?: () => void
  trailing?: ReactNode
}) {
  const clickable = Boolean(onClick)
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3.5 text-left outline-none transition-colors",
        clickable && "cursor-pointer hover:bg-muted"
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        {clickable ? <ChevronRight className="size-4 text-muted-foreground/50" /> : null}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { isAuthenticated } = useConvexAuth()
  const viewer = useQuery(anyApi.users.viewer, isAuthenticated ? {} : "skip")
  const overview = useQuery(anyApi.adminDashboard.getOverview, isAuthenticated ? {} : "skip")
  const branding = useQuery(anyApi.institutions.getBranding, isAuthenticated ? {} : "skip")
  const updateName = useMutation(anyApi.users.updateName)
  const generateLogoUploadUrl = useMutation(anyApi.institutions.generateLogoUploadUrl)
  const setInstitutionLogo = useMutation(anyApi.institutions.setInstitutionLogo)
  const [editingName, setEditingName] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setUploadingLogo(true)
    try {
      const uploadUrl = await generateLogoUploadUrl()
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!response.ok) throw new Error("Upload failed")
      const { storageId } = await response.json()
      await setInstitutionLogo({ storageId })
      toast.success("Logo updated", {
        description: "Your school logo now appears across the dashboard.",
      })
    } catch (err) {
      toast.error("Couldn't update logo", {
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  if (viewer === undefined || overview === undefined) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">Your account and institution, at a glance.</p>

      <SettingsSection label="Account">
        <SettingsRow title="Name" subtitle={viewer?.name ?? "—"} onClick={() => setEditingName(true)} />
        <SettingsRow title="Email" subtitle={viewer?.email ?? "—"} />
        <SettingsRow title="Role" subtitle={<span className="capitalize">{viewer?.role ?? "admin"}</span>} />
      </SettingsSection>

      <SettingsSection label="Institution">
        <SettingsRow
          title="Institution"
          subtitle={
            overview.institution
              ? `${overview.institution.name} · ${overview.institution.emailDomain}`
              : "Not configured yet."
          }
        />
        <SettingsRow
          title="Academic overview"
          subtitle={`${overview.counts.faculties} faculties · ${overview.counts.departments} departments · ${overview.counts.courses} courses · ${overview.counts.students} students`}
        />
        <SettingsRow
          title="School logo"
          subtitle={
            uploadingLogo
              ? "Uploading..."
              : branding?.logoUrl
                ? "Shown faintly across the dashboard background"
                : "No logo set"
          }
          onClick={() => !uploadingLogo && logoInputRef.current?.click()}
          trailing={
            branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Convex storage URL, not a local/optimizable asset
              <img
                src={branding.logoUrl}
                alt=""
                className="size-8 rounded-md border border-border bg-background object-contain"
              />
            ) : null
          }
        />
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleLogoChange(event)}
        />
      </SettingsSection>

      <SettingsSection label="Semester">
        <SettingsRow
          title="Active semester"
          subtitle={
            overview.activeSemester
              ? `${overview.activeSemester.title} · ${dateFormatter.format(new Date(overview.activeSemester.startDate))} – ${dateFormatter.format(new Date(overview.activeSemester.endDate))}`
              : "No active semester right now."
          }
          trailing={
            overview.activeSemester ? (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: "color-mix(in oklch, var(--chart-3) 15%, transparent)", color: "var(--chart-3)" }}
              >
                Active
              </span>
            ) : null
          }
        />
      </SettingsSection>

      <NameDialog
        open={editingName}
        onOpenChange={setEditingName}
        title="Edit your name"
        description="Shown across the admin dashboard."
        fieldLabel="Name"
        initialValue={viewer?.name ?? ""}
        onSubmit={async (value) => {
          await updateName({ name: value })
          toast.success("Name updated", {
            description: `You're now shown as "${value}".`,
          })
        }}
      />
    </div>
  )
}
