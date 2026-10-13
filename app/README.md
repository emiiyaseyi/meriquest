# MeriQuest (production app)

Next.js 16 + TypeScript. Read [../docs/RULEBOOK.md](../docs/RULEBOOK.md) first; it is the source of truth. QA results are in [../docs/QA-LOG.md](../docs/QA-LOG.md).

> The plain-JS prototype in `../game` is the earlier v0.1. This `/app` is the production build. Next.js 16 differs from older versions: read `node_modules/next/dist/docs/` before writing framework code (see `AGENTS.md`).

## Run it

Requires Node 24+.

```bash
cd app
npm install
cp .env.example .env.local   # then set DEFAULT_PASSWORD (12+ chars, random)
npm run db:migrate           # if using STORE=postgres (see docs/DATABASE-SETUP.md)
npm run dev                  # http://localhost:3000
```

On first run the app creates the bootstrap admin (`MS0001`) and, when `SEED_SAMPLE_STAFF=true` (development only), nine fictional sample staff. Everyone starts on the **default password** from `.env.local` and must choose their own at first sign-in.

## Quality gate (run before every commit)

```bash
npm run qa    # typecheck + lint + tests + production build
npm audit --omit=dev
```

## Layout

| Path | What |
|---|---|
| `src/lib/server/env.ts` | The only place that reads `process.env`; fails closed |
| `src/lib/server/store.ts`, `pg.ts` | Storage interface with Postgres (shared dev and production), file (single-process dev) and memory (tests) adapters. See `docs/DATABASE-SETUP.md` |
| `src/lib/server/config/` | Admin-editable settings: schemas, seeded defaults, registry |
| `src/lib/server/auth/` | Passwords, sessions, sign-in service, admin operations, Data Access Layer |
| `src/app/admin/` | Admin console: staff & access, settings, audit log |
| `src/proxy.ts` | CSP nonce and an optimistic sign-in redirect (real checks are in the DAL and every Server Action) |
| `test/` | Vitest suites |

## Rules that matter

- Nothing an admin may want to change is hardcoded: it goes in `src/lib/server/config/definitions.ts` with a schema and a default, and is edited under **Admin → Settings**.
- Every Server Action starts with `requireRole(...)`/`requireUser()`. Pages are not a security boundary.
- `STORE=file` is for single-process local development only. Production uses `STORE=postgres` with `DATABASE_URL`. Never commit the connection string.
- Commits are authored in the owner's name only, with no co-author trailer.
