"use client"

import { Bell, ChevronLeft } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  hierarchy: "Hierarchy",
  courses: "Courses",
  semesters: "Semesters",
  "semester-activities": "Semester Activities",
  publish: "Publish",
  settings: "Settings",
}

function getRouteLabel(pathname: string) {
  const [, , segment] = pathname.split("/").filter(Boolean)
  return segmentLabels[segment ?? ""] ?? "Dashboard"
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const segments = pathname.split("/").filter(Boolean)
  const isDeepRoute = segments.length > 3 // e.g. /admin/[id]/hierarchy/[deepId]

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-border bg-background px-4 shrink-0 transition-all">
      <div className="flex items-center gap-4">
        {isDeepRoute ? (
          <button
            onClick={() => router.back()}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground outline-none transition-colors shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="size-4" strokeWidth={2.5} />
          </button>
        ) : (
          <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0 transition-colors" />
        )}
        <div className="h-4 w-px bg-border max-md:hidden" />
        <span className="text-sm font-semibold tracking-tight text-foreground">{getRouteLabel(pathname)}</span>
      </div>

      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group outline-none border-none bg-transparent">
            <Bell className="size-5 group-hover:scale-110 transition-transform" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background"></span>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10 opacity-70">
              <Bell className="size-10 mb-4 opacity-30" />
              <p className="text-sm">You have no new notifications.</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
