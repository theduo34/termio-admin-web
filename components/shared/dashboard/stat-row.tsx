import type { LucideIcon } from "lucide-react"

type Stat = {
  label: string
  value: string
  icon?: LucideIcon
}

export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex flex-wrap divide-x divide-border rounded-md border border-border bg-card">
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-w-[140px] flex-1 items-center gap-3 px-6 py-5">
          {stat.icon ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <stat.icon className="size-4.5" strokeWidth={2.25} />
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
