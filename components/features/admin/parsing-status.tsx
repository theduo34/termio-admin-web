"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

const STAGES = [
  "Reading the document…",
  "Structuring the data…",
  "Cross-checking details…",
  "Wrapping up…",
]

const STEP_MS = 2500

// Convex actions don't stream intermediate progress — this is purely a client-side
// perceived-progress cue so a slow parse doesn't read as stalled, not a reflection of
// any real backend phase. Holds on the last stage rather than looping, since looping
// back to "Reading the document…" after minutes would read as having restarted.
export function ParsingStatus() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    // No reset-to-0 here — this component only ever mounts fresh when stage becomes
    // "parsing" (see the conditional render at each call site), so useState(0)'s own
    // initial value already covers it; setting it again in the effect body is what
    // react-hooks/set-state-in-effect flags as a cascading-render risk.
    const interval = setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, STAGES.length - 1))
    }, STEP_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      {STAGES[stepIndex]}
    </div>
  )
}
