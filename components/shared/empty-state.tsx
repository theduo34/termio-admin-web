import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

// One reusable empty-state shell — every "nothing here yet" state in the admin app
// should reach for this instead of its own copy of the same border/icon/text markup
// (that duplication is what this replaces). Only icon/title/description/action vary
// per call site.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 py-16 text-center text-muted-foreground">
      <Icon className="size-10 opacity-30" strokeWidth={1.5} />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
