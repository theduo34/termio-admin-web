"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth, useQuery } from "convex/react"
import { anyApi } from "convex/server"
import { CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { LoginForm } from "@/components/features/auth/login"
import { cn } from "@/lib/utils"

// The two panels meet along a seam; each side has a quarter-circle "notch" cut into
// the corner nearest the seam, filled with the OTHER side's color — that's what
// makes the boundary read as a soft wave instead of a hard straight line. A square
// positioned at a corner, with only the corner diagonally opposite that position
// rounded to 100%, renders as a quarter-disk centered exactly on that corner.
function CornerNotch({ position, color }: { position: "top-left" | "bottom-right"; color: "primary" | "background" }) {
  const radius =
    position === "top-left"
      ? "0 0 100% 0" // square pinned top-left → round its bottom-right corner
      : "100% 0 0 0" // square pinned bottom-right → round its top-left corner
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-10 size-16 sm:size-20 lg:size-24",
        position === "top-left" ? "top-0 left-0" : "right-0 bottom-0",
        color === "primary" ? "bg-primary" : "bg-background"
      )}
      style={{ borderRadius: radius }}
    />
  )
}

function BrandBadge({ size = 40, iconSize = 22 }: { size?: number; iconSize?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image src="/images/mark.png" alt="" width={iconSize} height={iconSize} className="object-contain" />
    </div>
  )
}

// Shown in place of the form once credentials are accepted — covers the gap
// between "signed in" and "landed on the dashboard" with real feedback instead
// of a blank/frozen form, and gives the success toast (fired the instant we know
// this is a real admin) a beat to actually be seen before the route changes.
function SigningInPanel({ state, name }: { state: "authenticating" | "success"; name?: string }) {
  const isSuccess = state === "success"
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="relative flex size-20 shrink-0 items-center justify-center">
        {!isSuccess && (
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/15 border-t-primary" />
        )}
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300",
            isSuccess && "scale-110"
          )}
        >
          {isSuccess ? (
            <CheckCircle2 className="size-7 text-primary" strokeWidth={2} />
          ) : (
            <Image src="/images/mark.png" alt="" width={28} height={28} className="object-contain" />
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold text-foreground">
          {isSuccess ? `Welcome back${name ? `, ${name}` : ""}!` : "Signing you in..."}
        </p>
        <p className="text-xs text-muted-foreground">
          {isSuccess ? "Redirecting to your dashboard" : "Verifying your credentials"}
        </p>
      </div>
    </div>
  )
}

export function LoginPage() {
  const router = useRouter()
  const { signIn, signOut } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // convex/ isn't owned by this repo (see CONVEX_BACKEND.md), so there's no
  // generated `api` for it — anyApi calls the mobile repo's function by name.
  const viewer = useQuery(anyApi.users.viewer, isAuthenticated ? {} : "skip")
  const isNotAdmin = isAuthenticated && viewer !== undefined && viewer?.role !== "admin"
  const isAdmin = isAuthenticated && viewer?.role === "admin" && Boolean(viewer.institutionId)
  // Covers both "credentials accepted, waiting on the viewer query" and "confirmed
  // admin, waiting out the redirect delay" — anything except the access-denied case,
  // which drops straight back to the form instead (see the isNotAdmin branch below).
  const showSigningIn = isAuthenticated && !isNotAdmin

  useEffect(() => {
    if (isNotAdmin) {
      toast.error("Access denied", {
        description: "This account doesn't have admin privileges.",
      })
      void signOut()
      return
    }
    if (isAdmin && viewer) {
      toast.success("Login successful!", {
        description: `Welcome back, ${viewer.name}.`,
        duration: 3000,
      })
      // Let the toast + the panel's success state actually register before the
      // route change unmounts this page — an instant redirect made both invisible.
      redirectTimeout.current = setTimeout(() => {
        router.replace(`/admin/${viewer.institutionId}/dashboard`)
      }, 900)
      return () => {
        if (redirectTimeout.current) clearTimeout(redirectTimeout.current)
      }
    }
  }, [isNotAdmin, isAdmin, isAuthenticated, viewer, signOut, router])

  async function handleSubmit(formData: FormData) {
    setSubmitError(null)
    setPending(true)
    try {
      await signIn("password", { ...Object.fromEntries(formData), flow: "signIn" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid email or password."
      setSubmitError(message)
      toast.error("Sign in failed", {
        description: message,
      })
      setPending(false)
    }
  }

  const formSection = (
    <>
      {showSigningIn ? (
        <SigningInPanel state={isAdmin ? "success" : "authenticating"} name={viewer?.name} />
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-primary">Welcome</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
          </div>

          <LoginForm
            pending={pending && !isNotAdmin}
            error={isNotAdmin ? "Invalid permissions" : submitError}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </>
  )

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Desktop / tablet — two equal halves, side by side. */}
      <div className="hidden min-h-screen w-full lg:flex">
        <div className="relative flex w-1/2 flex-col justify-between overflow-hidden bg-primary p-10 xl:p-14">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-black/10 blur-3xl" />

          <div className="relative z-20 flex items-center gap-2.5">
            <BrandBadge />
            <span className="text-base font-semibold text-primary-foreground">Termio</span>
          </div>

          <div className="relative z-20 flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-primary-foreground">Welcome back!</h1>
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/80">
              Sign in to manage your institution&apos;s hierarchy, semesters, and course catalogue.
            </p>
          </div>

          <p className="relative z-20 text-xs text-primary-foreground/60">Restricted to authorized staff only.</p>

          <CornerNotch position="bottom-right" color="background" />
        </div>

        <div className="relative flex w-1/2 flex-col items-center justify-center bg-background px-6 py-16">
          <CornerNotch position="top-left" color="primary" />
          <div className="relative z-20 flex w-full max-w-sm flex-col gap-8">{formSection}</div>
        </div>
      </div>

      {/* Mobile — stacked top (brand) / bottom (form) halves. */}
      <div className="flex min-h-screen w-full flex-col lg:hidden">
        <div className="relative flex h-[38vh] min-h-[220px] shrink-0 flex-col justify-between overflow-hidden bg-primary p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 size-56 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-20 flex items-center gap-2.5">
            <BrandBadge size={32} iconSize={18} />
            <span className="text-sm font-semibold text-primary-foreground">Termio Admin</span>
          </div>

          <div className="relative z-20 flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-primary-foreground">Welcome back!</h1>
            <p className="max-w-xs text-xs leading-relaxed text-primary-foreground/80">
              Sign in to manage your institution&apos;s dashboard.
            </p>
          </div>

          <CornerNotch position="bottom-right" color="background" />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-6 py-10">
          <CornerNotch position="top-left" color="primary" />
          <div className="relative z-20 flex w-full max-w-sm flex-col gap-8">
            {formSection}
            <p className="text-center text-xs text-muted-foreground/70">
              Restricted to authorized staff. Contact your administrator for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
