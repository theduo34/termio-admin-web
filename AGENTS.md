<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Termio Admin

This app is the backend admin dashboard for **Termio**, a student semester reminder
mobile app (separate repo). Keep that boundary in mind:

- This repo does **not** own `convex/` — schema and functions are authored in the
  mobile repo. Never run `npx convex deploy` from here unless that has been
  deliberately decided otherwise. `convex/_generated/*` is synced from the shared
  deployment for types only.
- Admin accounts are created only via the mobile repo's
  `convex/admins.ts#createAdminAccount` (dashboard/CLI-only). This app is
  **sign-in only** — no signup, no self-service password reset.
- Every mutation must check `role === 'admin'` server-side via the authenticated
  identity. Never trust a client-sent `role` or user id.

## Platform boundary — admin is web-only, students are mobile-only

Deliberate and symmetric: an admin (`role === 'admin'`) never gets a usable session in
the mobile app (it lands on a plain "sign in from the web dashboard" screen instead,
see that repo's `app/admin-blocked.tsx` and `hooks/use-auth-gate.ts`) and a student
(`role === 'student'`) never gets a usable session here. Both accounts share one Convex
Auth backend and one Password provider, so a student's credentials *can* authenticate
against this app's `/login` — nothing at the Convex Auth layer prevents that. The
actual enforcement is entirely in this repo: `login-page.tsx` signs out and rejects any
authenticated session whose `role` isn't `'admin'`, and — more importantly, since that
check only runs after a client component mounts — every real route additionally goes
through `app/(protected)/admin/[institutionId]/layout.tsx`'s server-side guard (see
below), which re-checks `role === 'admin'` before rendering anything. Don't relax
either check on the assumption "only admins would ever sign in here."

## URL structure — `/admin/[institutionId]/...`

Every real admin page lives under `app/(protected)/admin/[institutionId]/` —
`/admin/[institutionId]/dashboard`, `/hierarchy`, `/courses`, `/semesters`,
`/semester-activities`. The `[institutionId]` segment isn't decorative: this project's
schema already supports more than one institution (see the mobile repo's AGENTS.md,
"Signup email-domain matching"), and this URL shape is what a future multi-institution
admin (or an admin impersonating/viewing another institution, if that's ever built)
would need — one canonical URL per institution's data, not an implicit "whichever
institution the signed-in admin happens to belong to." `app/(protected)/admin/
[institutionId]/layout.tsx` is the guard: it resolves the caller's own `institutionId`
server-side (via `convexAuthNextjsToken()` + `fetchQuery(anyApi.users.viewer, ...)`,
the documented way to make an authenticated Convex call from a Server Component) and
redirects to the admin's *own* institution's dashboard if the URL's segment doesn't
match — mirroring the `role`/`uuid` path-guard pattern from an earlier project this
one's layout shape was modeled on. `app/page.tsx` (root) does the same lookup and
redirects straight to `/admin/{institutionId}/dashboard` — there's no "pick your
institution" step, same as the mobile app has no "pick your institution" step at
signup. `AppSidebar` builds its links by reading `institutionId` from the URL itself
(`useParams()`), not a second query — the layout guard above already guarantees it's
correct before any page below it renders.

`proxy.ts` (this project's Next.js 16 middleware — the file was renamed from
`middleware.ts`, see the top of this file) only checks "is there *any* authenticated
session" and redirects to `/login` otherwise; it deliberately does not check `role` or
`institutionId` — that's the `[institutionId]/layout.tsx` guard's job, since role
requires a real Convex query the edge middleware isn't set up to make cheaply here.

## Conventions

- Use the semantic design tokens already defined in `app/globals.css`
  (`primary`, `secondary`, `muted`, `accent`, `destructive`, `card`, `popover`,
  `sidebar`, etc.) via Tailwind utilities (`bg-primary`, `text-muted-foreground`,
  ...). Do not use raw color utilities (`bg-blue-500`, `text-gray-600`).
- Code shared across features/pages lives in `components/shared`.
- Avoid unnecessary comments — code should be self-documenting.
