type Year = { _id: string; startDate: number; endDate: number }

// "Current on top" means the year containing the active semester (if any) comes
// first, then years that haven't started yet (soonest first), then years already
// over (most recently ended first) — not a flat newest-to-oldest sort, which could
// bury the active year under a not-yet-started future year created ahead of time.
export function sortYearsCurrentFirst<T extends Year>(years: T[], activeYearId: string | null): T[] {
  const now = Date.now()
  return [...years].sort((a, b) => {
    if (a._id === activeYearId) return -1
    if (b._id === activeYearId) return 1
    const aUpcoming = a.startDate > now
    const bUpcoming = b.startDate > now
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1
    return aUpcoming ? a.startDate - b.startDate : b.endDate - a.endDate
  })
}
