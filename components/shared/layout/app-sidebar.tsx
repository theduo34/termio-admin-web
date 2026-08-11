"use client"

import { useState } from "react"
import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth, useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { useRouter } from "next/navigation"

import {
  BookOpen,
  Calendar,
  LayoutGrid,
  Megaphone,
  Network,
  Settings,
  LogOut,
  UserCircle,
  ChevronsUpDown,
} from "lucide-react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import Image from "next/image"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  path: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "dashboard", icon: LayoutGrid },
  { label: "Hierarchy", path: "hierarchy", icon: Network },
  // Only reachable before this via the Dashboard's "Manage" dropdown — a real
  // top-level page deserves its own sidebar entry, not a link buried a click deep.
  { label: "Semesters", path: "semesters", icon: Calendar },
  { label: "Courses", path: "courses", icon: BookOpen },
  { label: "Publish", path: "publish", icon: Megaphone },
  { label: "Settings", path: "settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { institutionId } = useParams<{ institutionId: string }>()
  const { isMobile, setOpenMobile } = useSidebar()

  const router = useRouter()
  const { signOut } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const [signOutOpen, setSignOutOpen] = useState(false)

  const viewer = useQuery(anyApi.users.viewer, isAuthenticated ? {} : "skip")
  const branding = useQuery(anyApi.institutions.getBranding, isAuthenticated ? {} : "skip")
  async function handleSignOut() {
    await signOut()
    router.replace("/login")
  }
  const initials = (viewer?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)


  const base = `/admin/${institutionId}`

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="cursor-default hover:bg-transparent active:bg-transparent px-1.5"
            >
              <div className="flex items-center justify-center rounded-sm shrink-0">
                <Image src="/images/mark.png" alt="Termio Icon" width={32} height={32} className="object-contain" />
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <span className="text-xl font-bold text-foreground">Termio</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map(({ label, path, icon: Icon }) => {
                const href = `${base}/${path}`
                const active = isActive(href)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={
                        <Link href={href} onClick={() => isMobile && setOpenMobile(false)} />
                      }
                      tooltip={label}
                      className={cn(
                        "h-11 gap-0 rounded-md border-none px-3 font-medium transition-colors duration-150 group-data-[collapsible=icon]:justify-center",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="size-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                      <span className="ms-3 text-base group-data-[collapsible=icon]:hidden">{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex w-full items-center gap-3 transition-colors rounded-md h-14 bg-sidebar-accent/50 hover:bg-sidebar-accent/70 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center px-1.5 focus:outline-none"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary text-base font-bold text-secondary-foreground outline-none">
                  {branding?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external Convex storage URL, not a local/optimizable asset
                    <img src={branding.logoUrl} alt="" className="size-full object-contain" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-foreground text-sm">{viewer?.name ?? "Admin"}</span>
                  <span className="truncate text-xs text-muted-foreground font-medium">Administrator</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-md shadow-lg border-border/50"
                side={isMobile ? "bottom" : "top"}
                align="center"
                sideOffset={14}
              >
                <div className="px-3 py-2 mb-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {viewer?.name ?? "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{viewer?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem className="gap-3 px-3 py-2 text-sm font-medium" disabled>
                  <UserCircle className="size-4.5" />
                  Admin Privilege
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem
                  className="gap-3 px-3 py-2 text-sm font-medium text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-md"
                  onClick={() => setSignOutOpen(true)}
                >
                  <LogOut className="size-4.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        dialogVariant="modal"
        title="Sign out of Termio Admin?"
        description="You'll need to sign in again to manage the dashboard."
        confirmLabel="Sign out"
        pendingLabel="Signing out..."
        onConfirm={handleSignOut}
      />
    </Sidebar>
  )
}
