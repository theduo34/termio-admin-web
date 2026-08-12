export type DocumentCategory = "calendar" | "timetable" | "exam"

// Primary, instant category guess — a filename is almost always descriptive enough
// on its own (see the actual sample filenames this was built against: "2ND SEM
// TEACHING TIMETABLE...", "2ND-SEM-RESIT-EXAMS...", "ACADEMIC-CALENDAR..."). Checked
// before falling back to documentImport.ts#classifyDocument's Gemini call, which
// costs a request and only runs when this returns null. Order matters: "exam" is
// checked before "timetable" so "TEACHING TIMETABLE ... EXAM" style names (unlikely,
// but "resit"/"exam" is the more specific signal) don't get misread as a teaching
// timetable.
export function detectCategoryFromFilename(filename: string): DocumentCategory | null {
  const lower = filename.toLowerCase()
  if (/resit|exam/.test(lower)) return "exam"
  if (/timetable|teaching/.test(lower)) return "timetable"
  if (/calendar/.test(lower)) return "calendar"
  return null
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  calendar: "Academic Calendar",
  timetable: "Teaching Timetable",
  exam: "Exams & Resit",
}
