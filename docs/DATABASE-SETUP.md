# Database setup for MeriQuest

MeriQuest stores everything through one storage interface. The Postgres adapter works with **any standard Postgres** (Prisma Postgres, Neon, Supabase, a Meristem IT server). It only needs one setting, `DATABASE_URL`. Switching provider later is a change of that string plus running the migration.

> **Never paste the connection string or any password into chat, docs or git.** It lives only in `app/.env.local` (your PC, git-ignored) and the host's secret settings.

## Current setup (13 Oct 2026): Prisma Postgres, dev only
- Provider: **Prisma Postgres**, database `meriquestdbase`, region **Europe (Frankfurt)**, free plan.
- This is a **temporary dev database with fictional data only**. Real staff data needs the production decision below.
- Endpoint: Prisma's pooled endpoint (`pooled.db.prisma.io:5432`). The adapter works through it (checked: write, read, delete, and the transaction lock all pass).

### Use it on your PC
1. In `app/.env.local` set:
   ```
   STORE=postgres
   DATABASE_URL="postgres://...your string from the Prisma console..."
   ```
   (Leave `SEED_SAMPLE_STAFF=true` and `DEFAULT_PASSWORD` as they are for dev.)
2. Create the table (once, and again after any new migration):
   ```
   cd app
   npm run db:migrate
   ```
3. Check the connection any time:
   ```
   npm run db:check
   ```
   It prints only the host, TLS status, table status and a harmless write/read/delete test.
4. `npm run dev`, open http://localhost:3000.
5. To go back to local files, set `STORE=file`.

### Getting the connection string from Prisma
Console → your project → `meriquestdbase` → **Connect** / connection strings → copy the **direct** `postgres://` string (not an Accelerate, API-key or `prisma+postgres://` address). If the password has special characters (`@ : / # ?`) and the app cannot parse it, reset it to letters and numbers only.

## Before the pilot (decision needed)
Prisma's free plan has **no backups**, a 10-connection limit, and (per their pricing page) SOC 2 and ISO 27001 only on the Business plan. Frankfurt is outside Nigeria. Before real staff data goes in:
1. Meristem IT, Risk and the data protection officer approve the **provider and region** (NDPA 2023).
2. Choose a plan with **daily backups** at minimum (and ask about point-in-time recovery and an uptime SLA).
3. Create a separate **production** database and set `DATABASE_URL` only in the host's secret settings.
4. Run `npm run db:migrate` against it.

## Linking to Netlify (when the app is ready to deploy)
1. **Netlify → Add new site → Import an existing project → GitHub** → `emiiyaseyi/meriquest`.
2. Build settings: **Base directory** `app`, **Build command** `npm run build`. (I will update `netlify.toml` to match; until then the repo deliberately publishes the "retired" page.)
3. **Site configuration → Environment variables** (mark secrets as "Contains secret values"):

| Variable | Value | Secret |
|---|---|---|
| `STORE` | `postgres` | no |
| `DATABASE_URL` | the production connection string | **yes** |
| `DEFAULT_PASSWORD` | fresh random value, 12+ characters | **yes** |
| `BOOTSTRAP_ADMIN_PASSWORD` | a different fresh random value, 12+ characters | **yes** |
| `SEED_SAMPLE_STAFF` | `false` | no |
| `BOOTSTRAP_ADMIN_STAFF_ID` / `BOOTSTRAP_ADMIN_EMAIL` | `MS0001` / the L&D admin mailbox | no |

4. Do **not** set `NODE_ENV` (Netlify sets it). In production the app refuses to start if a secret is missing, if TLS to the database is not verified, if sample staff are enabled, or if local files are used without permission.
5. Deploy, sign in as `MS0001` with the bootstrap password, set your own password, add staff under **Admin → Staff & access**.
6. Use a Meristem subdomain once IT agrees. If pages feel slow, match the Netlify functions region to the database region (some plans charge for this).

## Why a single `kv` table?
Every collection (users, sessions, settings, audit, placements…) is a row keyed by `(col, id)` holding JSON. It kept the app independent of any one database. When reporting and analytics need real tables, we add proper tables beside it with new migrations (`app/db/migrations/`). Row level security is switched on with no policies, so if the database is ever exposed through a public API, anonymous users read nothing.
