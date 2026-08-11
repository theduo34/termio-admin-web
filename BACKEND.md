# Termio Backend — Admin Web App

## Architecture

This repo is a **pure client** of the shared Convex backend owned by `student-semester-reminder`.

```
termio-admin/          ← Next.js web app (you are here)
  convex.json          ← { "functions": "../student-semester-reminder/convex/" }
  .env.local           ← CONVEX_URL = https://colorless-shepherd-537.convex.cloud

student-semester-reminder/   ← Mobile app (owns the backend)
  convex/              ← ALL backend functions live here
  .env.local           ← CONVEX_URL = https://colorless-shepherd-537.convex.cloud
```

Both apps point to the **same** Convex deployment. `convex.json` in this repo
tells the Convex CLI to look in `../student-semester-reminder/convex/` for
functions, so running `bun convex dev` from **this repo** will also work — it
simply syncs the mobile app's backend. No duplication, no conflict.

## Starting Convex dev

You may start from **either repo**:

```bash
# Option A — from the admin web app
cd termio-admin
bun convex dev        # syncs ../student-semester-reminder/convex/

# Option B — from the mobile app
cd student-semester-reminder
bun convex dev        # same deployment, same result
```

> **⚠️ Never** maintain a `convex/` folder inside `termio-admin`. If one
> appears, delete it immediately — it would overwrite the real backend.

## Adding new backend functionality

All new mutations, queries, and schema changes go into
`student-semester-reminder/convex/`. After saving, `convex dev` (from either
repo) will push them automatically.

Use `anyApi.<file>.<function>` in the web app to call them — the `convex/`
folder here is not generated, so there is no `api` object. Example:

```ts
import { anyApi } from "convex/server"
const faculties = useQuery(anyApi.academicStructure.listFaculties)
```

## Environment variables

| Variable | Value |
|---|---|
| `CONVEX_URL` | `https://colorless-shepherd-537.convex.cloud` |
| `AUTH_RESEND_KEY` | Resend API key (email OTP) |

## Admin account creation

Admin accounts are **CLI-only** — there is no sign-up form.

```bash
cd student-semester-reminder
npx convex run admins:createAdminAccount \
  '{"email":"admin@ktu.edu.gh","password":"secret","name":"Admin Name","institutionId":"<id>"}'
```
