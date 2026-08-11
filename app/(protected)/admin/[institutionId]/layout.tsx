import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { fetchQuery } from "convex/nextjs"
import { anyApi } from "convex/server"
import { redirect } from "next/navigation"

interface Props {
  children: React.ReactNode
  params: Promise<{ institutionId: string }>
}

// The route's own guard: proxy.ts only checks "is there a session" (any signed-in
// user, any role — it's the same Convex Auth backend the mobile app's students use).
// This is where role and institutionId actually get enforced, server-side, before any
// admin page renders — a student session or an admin viewing the wrong institution's
// URL never reaches `children`. convex/ isn't owned by this repo (see AGENTS.md), so
// there's no generated `api` for it — anyApi calls the mobile repo's function by name.
export default async function InstitutionLayout({ children, params }: Props) {
  const { institutionId } = await params

  const token = await convexAuthNextjsToken()
  if (!token) redirect("/login")

  const viewer = await fetchQuery(anyApi.users.viewer, {}, { token })

  if (!viewer || viewer.role !== "admin" || !viewer.institutionId) {
    redirect("/login")
  }

  if (viewer.institutionId !== institutionId) {
    redirect(`/admin/${viewer.institutionId}/dashboard`)
  }

  return children
}
