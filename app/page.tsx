import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { fetchQuery } from "convex/nextjs"
import { anyApi } from "convex/server"
import { redirect } from "next/navigation"

export default async function Home() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect("/login")

  const viewer = await fetchQuery(anyApi.users.viewer, {}, { token })

  if (!viewer || viewer.role !== "admin" || !viewer.institutionId) {
    redirect("/login")
  }

  redirect(`/admin/${viewer.institutionId}/dashboard`)
}
