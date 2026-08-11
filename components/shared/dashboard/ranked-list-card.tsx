type RankedItem = {
  id: string
  label: string
  value: number
  share: number
}

export function RankedListCard({
  title,
  subtitle,
  items,
  totalLabel,
}: {
  title: string
  subtitle?: string
  items: RankedItem[]
  totalLabel?: string
}) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-md border border-border bg-card p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to show yet.</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {items.map((item, index) => {
            const isFirst = index === 0

            return (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {item.value.toLocaleString()} &middot; {item.share}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${item.share}%`, opacity: isFirst ? 1 : 0.35 }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalLabel ? <p className="mt-auto text-xs text-muted-foreground">{totalLabel}</p> : null}
    </div>
  )
}
