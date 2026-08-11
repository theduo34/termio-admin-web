import type { ReactNode } from "react"

import { ProtectedLayout } from "@/components/shared/layout/protected-layout"

export default function Layout({ children }: { children: ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>
}
