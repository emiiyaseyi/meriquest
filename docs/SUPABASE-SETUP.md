# Supabase setup for MeriQuest

> **Superseded (13 Oct 2026):** the app now uses any standard Postgres through `DATABASE_URL`, and dev runs on Prisma Postgres. See [DATABASE-SETUP.md](DATABASE-SETUP.md). This guide remains useful if Supabase is chosen for production; its dashboard permission error was never resolved.

Purpose: the production database (Postgres) that replaces the local file store. This guide is for the owner. **Never paste keys or passwords into chat, docs or git.** They go only into `.env.local` (your PC) and Netlify's environment settings.

## What I saw in your account (13 Oct 2026)
- Organisation **skulos** (Free plan), project **emiiyaseyi's Project**, region **Central EU (Frankfurt)**, compute **Nano**, status Healthy.
- **No backups** (the Free plan has none) and the Free plan **pauses projects after about a week of inactivity**. Neither is acceptable for staff data.
- The project sits in a personal organisation under a personal address.

## Recommendation
1. Do **not** use `emiiyaseyi's Project` for MeriQuest. Keep it for experiments.
2. Create a **new organisation** named `Meristem` (owned by a company mailbox such as `ld.admin@meristemng.com`, not a personal Gmail), and inside it **two projects**: `meriquest-dev` and `meriquest-prod`.
3. Put `meriquest-prod` on the **Pro plan** (daily backups, no pausing). `meriquest-dev` can stay Free.
4. **Region and data residency:** staff data is personal data under the NDPA 2023. Frankfurt is outside Nigeria. Before real staff data goes in, get **IT/Risk and the Data Protection Officer** to approve the region (and complete the DPIA). Pick the region once: it cannot be changed later without recreating the project.
5. Turn on **MFA** for every Supabase dashboard user and keep at least two admins.

## Steps
1. Go to `supabase.com/dashboard` and sign in (company mailbox if possible).
2. **New organisation** → name `Meristem` → plan Free for now.
3. **New project** → name `meriquest-dev` → generate a strong database password and store it in your password manager → choose the region agreed in step 4 → Create. Wait until it shows **Healthy**.
4. Open **Project Settings → API** and note:
   - **Project URL** (public, fine to store in `.env.local`).
   - **Secret / service-role key**: this bypasses all security. It lives **only** in `.env.local` and Netlify env vars, never in client code, chat or git.
5. Open **Project Settings → Database** and note the connection string (used by migrations). Same handling as the secret key.
6. Tell me when the project is Healthy. I will then:
   - write the SQL migrations (tables for users, sessions, config, audit, rate limits);
   - turn on **Row Level Security** on every table with no public policies (all access goes through the server with the secret key);
   - build and test the Postgres store adapter;
   - give you a short list of environment variables to paste into `.env.local` and Netlify.
7. Later: repeat for `meriquest-prod` on the Pro plan, and connect Netlify (separate guide).

## Linking it with Netlify (do this after the storage adapter exists)
The app cannot run on Netlify until the Supabase adapter is built (it needs a database, not local files). When I tell you the adapter is ready:

1. **Netlify → Add new site → Import an existing project → GitHub** and choose `emiiyaseyi/meriquest`.
2. Build settings: **Base directory** `app`, **Build command** `npm run build`. Leave the publish directory to Netlify's Next.js runtime (it detects Next.js). I will update `netlify.toml` in the repo to match; until then the repo deliberately publishes the "retired" page.
3. **Site configuration → Environment variables**, add these (mark the secrets as **Contains secret values**, scope **Production** and **Deploy previews** only as needed):

| Variable | Value | Secret |
|---|---|---|
| `STORE` | `supabase` | no |
| `SUPABASE_URL` | the Project URL from Supabase → Project Settings → API | no |
| `SUPABASE_SECRET_KEY` | the secret / service-role key (server only) | **yes** |
| `DEFAULT_PASSWORD` | a fresh random value, 12+ characters | **yes** |
| `BOOTSTRAP_ADMIN_PASSWORD` | a different fresh random value, 12+ characters | **yes** |
| `SEED_SAMPLE_STAFF` | `false` | no |
| `BOOTSTRAP_ADMIN_STAFF_ID` / `BOOTSTRAP_ADMIN_EMAIL` | `MS0001` / the L&D admin mailbox | no |

   The variable names for Supabase are provisional; the adapter task will confirm them and update `.env.example`.
4. Do **not** set `NODE_ENV` (Netlify sets it to production). In production the app refuses to start if a secret is missing, if `DEFAULT_PASSWORD` equals the old prototype password, or if `SEED_SAMPLE_STAFF=true`.
5. **Deploys → Trigger deploy**. Open the site URL, sign in as the bootstrap admin, set your own password, then add staff in **Admin → Staff & access**.
6. **Domain settings:** use a Meristem subdomain (for example `meriquest.meristem.com.ng`) once IT agrees. Netlify provides HTTPS automatically.
7. Region note: Netlify's server functions default to a US region on some plans, which adds delay to every database call. If it feels slow, set the functions region to match Supabase's (Pro plan feature, check Netlify's current options).

## What I will not do
- I will not ask for your keys in chat. You paste them into `.env.local` yourself.
- I will not use the Supabase JS client in the browser: all data access is server-side, behind the sign-in checks in the app.
