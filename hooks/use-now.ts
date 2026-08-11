"use client"

import { useEffect, useState } from "react"

/**
 * A one-time "now" timestamp, null until mounted on the client.
 *
 * Date.now() is impure — reading it directly during render would disagree between
 * the server-rendered pass and client hydration (a hydration mismatch). Deferring
 * it to an effect avoids that; this intentionally is NOT useSyncExternalStore,
 * because Date.now() returns a new value on every call — using it as getSnapshot
 * makes React think the store changed on every check, causing an infinite
 * "maximum update depth exceeded" render loop. A one-time mount-effect read is the
 * correct tool here, not a live external store.
 */
export function useNow() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    // Deliberate one-time client-only snapshot on mount, not a reaction to a
    // changing external source — the standard exception to this rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
  }, [])
  return now
}
