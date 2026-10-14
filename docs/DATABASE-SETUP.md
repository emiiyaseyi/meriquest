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

## Linking to Vercel (when the app is ready to deploy)
The owner decided (13 Oct 2026) to host on **Vercel**, not Netlify. `netlify.toml` is left in place only until the Vercel project exists.
1. **Vercel → Add New → Project → Import** the GitHub repo `emiiyaseyi/meriquest`.
2. Project settings: **Root Directory** `app`, framework **Next.js**, build command `npm run build`.
3. **Settings → Environment Variables** (mark secrets as Sensitive):

| Variable | Value | Secret |
|---|---|---|
| `STORE` | `postgres` | no |
| `DATABASE_URL` | the production connection string | **yes** |
| `DEFAULT_PASSWORD` | fresh random value, 12+ characters | **yes** |
| `BOOTSTRAP_ADMIN_PASSWORD` | a different fresh random value, 12+ characters | **yes** |
| `SEED_SAMPLE_STAFF` | `false` | no |
| `BOOTSTRAP_ADMIN_STAFF_ID` / `BOOTSTRAP_ADMIN_EMAIL` | `MS0001` / the L&D admin mailbox | no |

4. Do **not** set `NODE_ENV` (Vercel sets it). In production the app refuses to start if a secret is missing, if TLS to the database is not verified, if sample staff are enabled, or if local files are used without permission.
5. Deploy, sign in as `MS0001` with the bootstrap password, set your own password, add staff under **Admin → Staff & access**.
6. Use a Meristem subdomain once IT agrees. If pages feel slow, match the Vercel function region to the database region (some plans charge for this).

## First deployment to Vercel: a test deployment (step by step)
This is a **test** deployment: a private project on a **new, empty database**, with no real staff data. It does not need the IT and data-protection approval above; that is needed before real staff data goes in (see "Before real staff data goes in"). `app/vercel.json` is already in the repo: it sets the framework and runs the functions in **Frankfurt (`fra1`)**, so create the database in **Frankfurt (EU Central)** too. A function and a database in the same region is the biggest speed-up available: from a laptop in Lagos to a far database every query was about half a second.

**Part A: a new database on Supabase (once)**
1. In Supabase create a new project (for example `meriquest-test`) in region **Central EU (Frankfurt)**. A project's region cannot be changed later. Set a strong database password and keep it in a password manager.
2. Do **not** create tables by hand. The migration below creates the `kv` table (and `schema_migrations`) for you.
3. Click **Connect** (top bar) > **Connection string** > method **Transaction pooler**, and copy the URI. Replace `[YOUR-PASSWORD]` with the database password. (The direct connection is IPv6-only and does not work from Vercel; use the pooler.)
4. Supabase signs its database certificates with its own authority. Download it: **Project Settings > Database > SSL Configuration > Download certificate** (a `.crt` file). The app still verifies the connection fully; it just needs this certificate to trust it. Its text goes in `DATABASE_CA_CERT`.
5. On your machine, in PowerShell, from the `app` folder, run the migration once (replace the two placeholders; keep the quotes):
   ```
   $env:DATABASE_URL = "paste the connection string here"
   $env:DATABASE_CA_CERT = Get-Content "$HOME\Downloads\prod-ca-2021.crt" -Raw   # the file you downloaded
   node scripts/migrate.mjs
   Remove-Item Env:DATABASE_URL, Env:DATABASE_CA_CERT
   ```
   It should say it applied `0001_kv.sql`. In Supabase > **Table Editor** you should now see `kv` and `schema_migrations`.
6. Recommended: **Project Settings > Data API**: switch the Data API off. The app talks to the database directly, so nothing needs it, and the tables also have row-level security on with no policies.

**Part B: the Vercel project**
1. Vercel > **Add New > Project > Import** the GitHub repo `emiiyaseyi/meriquest` (the repo stays private).
2. **Root Directory:** `app`. Framework: Next.js (detected). Leave the build command as `npm run build`.
3. **Environment Variables** (tick **Sensitive** for the secrets; apply to Production and Preview):

| Variable | Value | Secret |
|---|---|---|
| `STORE` | `postgres` | no |
| `DATABASE_URL` | the new database string from Part A | **yes** |
| `DEFAULT_PASSWORD` | a new random value, 12+ characters (the shared first-sign-in password) | **yes** |
| `BOOTSTRAP_ADMIN_PASSWORD` | a different random value, 12+ characters | **yes** |
| `DATABASE_CA_CERT` | the full text of the Supabase certificate (`-----BEGIN CERTIFICATE-----` to `-----END CERTIFICATE-----`) | no |
| `TOTP_KEY` | 32 random bytes in base64 (needed for two-step sign-in in production) | **yes** |
| `BOOTSTRAP_ADMIN_STAFF_ID` | `MS0001` | no |
| `BOOTSTRAP_ADMIN_EMAIL` | the L&D admin mailbox | no |

   Do **not** set `NODE_ENV`, and do **not** set `SEED_SAMPLE_STAFF`: Vercel runs in production mode, where the app refuses to start with sample staff on. Make random values with a password manager, or in PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))` for `TOTP_KEY`.
4. Click **Deploy**. When it finishes, open the address Vercel gives you.

**Part C: first sign-in**
1. Sign in as `MS0001` with `BOOTSTRAP_ADMIN_PASSWORD`, set your own password, then set up two-step sign-in (Account > Two-step sign-in).
2. Add a few **test staff** under Admin > Staff & access (one per pilot unit: Customer Experience, Wealth Advisory, Investment Advisory). They sign in with `DEFAULT_PASSWORD` and are asked to change it.
3. The courses load into the new database the first time anyone opens the Academy, so that first open is slower.
4. Check Settings: open Settings > Phone apps if you want the new apps shown as live.

**Known limits of a test deployment**
- Vercel accepts a request of about **4.5 MB** at most. A conduct concern with three 2 MB evidence files (up to 6 MB) will fail there; one or two files are fine. Say if you want the app limit lowered to match.
- Virus scanning and the private evidence bucket are not set up (see below): evidence files are kept as "pending" and an admin cannot open them until a scan is configured.
- Use the Vercel project's **Deployment Protection** (or keep the address private) so only you and the testers open it.
- The Vercel plan's single-region and time-out limits apply; a slow first page after a quiet spell is a cold start.

## Evidence files and virus scanning (before wide rollout)
Conduct-concern evidence (pictures and PDFs) is private. By default it stays in the database, which is fine for development. For production set:

| Variable | Value | Secret |
|---|---|---|
| `SUPABASE_URL` | your Supabase project URL | no |
| `SUPABASE_SERVICE_KEY` | the service-role key (server only, never in the browser) | **yes** |
| `EVIDENCE_BUCKET` | a **private** bucket name (default `concern-evidence`; create it first) | no |
| `EVIDENCE_SCANNER_URL` | HTTPS address of a virus-scan service (for example a small ClamAV wrapper) that accepts the file as the request body and answers `{"infected": true or false}` | no |
| `EVIDENCE_SCANNER_TOKEN` | optional bearer token for that service | **yes** |

What happens: every file is scanned before it is stored; an infected file is refused and the attempt is logged. If the scanner cannot be reached, or none is set in production, the file is kept as *pending*: the reporter is not blocked, but an admin cannot open it until a later scan says it is clean. Files saved before this change stay readable.

## Why a single `kv` table?
Every collection (users, sessions, settings, audit, placements…) is a row keyed by `(col, id)` holding JSON. It kept the app independent of any one database. When reporting and analytics need real tables, we add proper tables beside it with new migrations (`app/db/migrations/`). Row level security is switched on with no policies, so if the database is ever exposed through a public API, anonymous users read nothing.
