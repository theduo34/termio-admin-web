"use client"

import { useQuery } from "convex/react"
import { anyApi } from "convex/server"

// A faint institution-logo watermark behind the page content — visible if you
// look, never competing with anything in the foreground. Renders nothing until
// an admin sets a logo (Settings' Institution section).
export function PageBackgroundLogo() {
  const branding = useQuery(anyApi.institutions.getBranding)

  if (!branding?.logoUrl) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- external Convex storage URL, not a local/optimizable asset */}
      <img
        src={branding.logoUrl}
        alt=""
        className="w-56 object-contain opacity-[0.04] grayscale sm:w-72 lg:w-[28rem] xl:w-[34rem] 2xl:w-[40rem]"
      />
    </div>
  )
}
