import type { ReactNode } from "react"

import { AppSidebar } from "@/components/shared/layout/app-sidebar"
import { PageBackgroundLogo } from "@/components/shared/layout/page-background-logo"
import { Topbar } from "@/components/shared/layout/topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-canvas">
            {/* Positioned relative to this wrapper, not to `main` itself, so the
                watermark is part of the normal scrolling content — it scrolls past
                with the page instead of staying pinned to the viewport. */}
            <div className="relative min-h-full p-4 md:p-8 lg:p-10">
              <PageBackgroundLogo />
              <div className="relative z-10">{children}</div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
