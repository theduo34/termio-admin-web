# Termio Admin

The admin dashboard for **Termio**, a student semester reminder app. Manages an
institution's academic hierarchy, semesters, courses, and published activities — the
data the [student mobile app](https://github.com/theduo34/student-semester-reminder)
reads and reminds students about.

Next.js 16 (App Router, Turbopack), Convex Auth, Tailwind v4. This app does **not**
own the backend — it's a pure client of the Convex deployment defined in the sibling
`student-semester-reminder` repo. See [BACKEND.md](./BACKEND.md) before touching
anything Convex-related.

## Prerequisites

- Node 20+
- npm (or bun — `bun.lock` is present and both work)
- The `student-semester-reminder` repo, cloned as a **sibling directory** — not
  optional. `convex.json` points at `../student-semester-reminder/convex/`, so this
  app can't resolve backend functions/types without it sitting right next to this one:

  ```
  some-folder/
    termio-admin/                  ← this repo
    student-semester-reminder/     ← the mobile repo, same parent folder
  ```

## Setup

1. Clone both repos side by side as shown above.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the env template and fill in the values:
   ```bash
   cp .env.example .env.local
   ```
   Both apps talk to the same Convex deployment, so use the **same values** as the
   mobile repo's own `.env.local` — ask a maintainer for them, or see
   [BACKEND.md](./BACKEND.md) to provision your own deployment from scratch.
4. Sync the backend once (from either repo — they share one deployment):
   ```bash
   npx convex dev
   ```
   First run prompts a GitHub login for Convex. Once it prints "Convex functions
   ready!", `Ctrl+C` out — you don't need to keep it running for day-to-day admin dev,
   only when the mobile repo's `convex/` has changed since you last synced.
5. Start the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) — it redirects to `/login`.
6. Sign in with the seeded demo admin account:
   ```
   admin@example.com / admin1234
   ```
   (Seeded by the mobile repo's `convex/seed.ts` — see that repo's README if it
   doesn't work and needs re-seeding.)

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run a production build |
| `npm run lint` | ESLint |

## Project layout

- `app/(auth)/login` — the sign-in page (no signup — admin accounts are CLI-only, see
  below)
- `app/(protected)/admin/[institutionId]/` — every real admin page (dashboard,
  hierarchy, semesters, courses, publish, settings), gated by a server-side
  `role === "admin"` check
- `components/ui/` — base primitives (Base UI, not Radix)
- `components/shared/` — cross-page building blocks (layout, dialogs, dashboard cards)
- `components/features/` — page-specific feature components
- `convex/_generated/` — type stubs only, synced from the mobile repo's deployment
  (see Prerequisites) — never hand-edited, never the source of real backend code

## Creating an admin account

There's no sign-up form. Admin accounts are created from the **mobile repo**, via CLI:

```bash
cd student-semester-reminder
npx convex run admins:createAdminAccount \
  '{"email":"you@example.com","password":"...","name":"Your Name","institutionId":"<id>"}'
```

See [BACKEND.md](./BACKEND.md) for details.

## Further reading

- [BACKEND.md](./BACKEND.md) — how the two repos share one Convex deployment, and the
  rule about never letting this repo run `npx convex deploy`
- [AGENTS.md](./AGENTS.md) — routing/auth architecture and project conventions
- [CONVEX_BACKEND.md](./CONVEX_BACKEND.md) — schema and function reference (written
  early in the project; some tables it lists as "no mutations yet" now have them —
  cross-check against the mobile repo's own `convex/` before relying on it)
