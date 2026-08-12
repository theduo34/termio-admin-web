"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import type { FunctionReference } from "convex/server"

type PaginationResult<T> = { page: T[]; isDone: boolean; continueCursor: string }

// Manual cursor-stack pagination, not Convex's own usePaginatedQuery — that hook is
// append-only ("load more", accumulating every page's results into one ever-growing
// list), the opposite of what a discrete Prev/Next "only fetch the page you're
// looking at" UI needs. Advancing to a page that hasn't been fetched yet leaves
// `items` undefined (not a stale previous page) until Convex resolves it — that IS
// the "only fetch on Next, show a loading state" behavior being asked for, not
// something layered on top of it.
export function useCursorPage<T>(
  queryRef: FunctionReference<"query">,
  args: Record<string, unknown> | "skip",
  pageSize: number
) {
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [pageIndex, setPageIndex] = useState(0)

  const result = useQuery(
    queryRef,
    args === "skip" ? "skip" : { ...args, paginationOpts: { cursor: cursors[pageIndex], numItems: pageSize } }
  ) as PaginationResult<T> | undefined

  function nextPage() {
    if (!result || result.isDone) return
    setCursors((current) => [...current.slice(0, pageIndex + 1), result.continueCursor])
    setPageIndex((index) => index + 1)
  }

  function prevPage() {
    setPageIndex((index) => Math.max(0, index - 1))
  }

  return {
    items: result?.page,
    isLoading: args !== "skip" && result === undefined,
    hasNext: result ? !result.isDone : false,
    hasPrev: pageIndex > 0,
    page: pageIndex + 1,
    nextPage,
    prevPage,
  }
}
