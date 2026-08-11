// Time-elapsed calculation shared by the Dashboard hero card and the semester
// detail page — same "how far into the semester are we" math the mobile app's
// own Home progress card uses, so both apps agree on what this means.
export function computeSemesterProgress(startDate: number, endDate: number, now: number) {
  if (now <= startDate) return { percent: 0, label: "Not started yet" }
  if (now >= endDate) return { percent: 100, label: "Semester ended" }
  const percent = Math.round(((now - startDate) / (endDate - startDate)) * 100)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksRemaining = Math.max(1, Math.ceil((endDate - now) / msPerWeek))
  return { percent, label: `${weeksRemaining} week${weeksRemaining === 1 ? "" : "s"} remaining` }
}
