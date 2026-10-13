# MeriQuest QA and security log

Every change passes the gate in [RULEBOOK §5.1](RULEBOOK.md) before it is committed. Each run is recorded here, with evidence, accepted risks and open items.

---

## M1: Foundation (13 Oct 2026)
Scope: Next.js 16 + TypeScript app in `/app`; server-only config registry with admin editing; staff directory; server-side sign-in (staff ID/email + password), forced first-login change, lockout, rate limiting, opaque sessions; admin console (staff & access, settings, audit log); CSP nonce proxy and security headers.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build and types | **Pass** | `npm run build` clean; `tsc --noEmit` clean; all 9 routes server-rendered per request |
| 2 | Automated tests | **Pass** | 124 tests in 6 files (store, password, config, auth/sessions/rate limit, admin/authz/seed, bootstrap and production env validation) |
| 3 | Input validation | **Pass** | zod schemas on env, config, staff creation; strict (no extra keys); identifier, password, JSON size, route-param and search-text limits; tested with hostile inputs |
| 4 | Authn / authz | **Pass** | Every page uses the DAL (`requireUser`/`requireRole`); every Server Action starts with `requireRole("admin")`; admin functions re-read the actor's role from the store (forged DTOs rejected) |
| 5 | Passwords and sessions | **Pass** | bcrypt (cost 12) over a SHA-256 prehash (no 72-byte truncation); default password only from server env; sessions are random 256-bit tokens stored as SHA-256 hashes; `__Host-` cookie `Secure; HttpOnly; SameSite=Lax; Path=/`; fresh session on login; all sessions revoked on password change/reset/disable; lockout; per-identifier and per-IP throttling; generic errors; timing-equalised failures |
| 6 | Web security | **Pass** | Nonce-based CSP (14/14 script tags carry the nonce, 0 inline handlers); `X-Frame-Options: DENY`, `nosniff`, HSTS, Referrer-Policy, Permissions-Policy, COOP; no `X-Powered-By`; no `dangerouslySetInnerHTML`; Server Actions origin check confirmed ("Invalid Server Actions request" for a cross-origin POST) |
| 7 | Secrets | **Pass** | `.env*` ignored (template `.env.example` committed, no values); `.env.local` and `.data/` ignored; pattern scan of source/tests found nothing; the prototype's public default password is rejected by env validation in production |
| 8 | Server-authoritative | **Pass (scope so far)** | Roles, status and flags are read from the store on each request, never from the cookie |
| 9 | Data safety | **Pass** | Audit log of sign-ins, failures, locks, resets, role/settings changes (no secrets in details); DTOs strip the hash; no real client data |
| 10 | Dependencies | **Pass with accepted risk** | `npm audit --omit=dev`: **0 vulnerabilities**. Full audit: 5 high, all in the dev-only lint chain (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`, stack-exhaustion on crafted glob patterns). Not shipped, not reachable at runtime. The suggested "fix" downgrades to Next 14 tooling, so it is not taken. Revisit on each dependency update |
| 11 | Error handling | **Pass** | Custom `error.tsx` (never shows messages or stacks), `not-found.tsx`; corrupt store file fails loudly instead of wiping data; env validation fails closed |
| 12 | Review | **Pass after fix** | Live attack tests (below) and a `/security-review` of the staged diff: 1 finding (High confidence 8/10), the bootstrap admin could be taken over with the shared default password. **Fixed**; the staff-account part is an open owner decision (see Findings and RULEBOOK §13 item 11) |

### Live attack tests against a production build (`next start`)
- Unauthenticated `/`, `/admin`, `/admin/staff`, `/admin/config/auth`, `/change-password` → 307 to `/login`.
- Wrong password → generic error, no cookie. Default password → 303 to `/change-password`, cookie flags correct.
- While on the default password: `/admin` is blocked (redirect to `/change-password`).
- After changing the password: the old session is dead; the new one works.
- Garbage, forged and path-traversal cookies → redirected to `/login`.
- `/admin/config/__proto__` and unknown keys → 404.
- Cross-origin form POST → rejected by Next.js, no cookie set.
- **Privilege tests:** a signed-in *player* replayed admin actions by direct POST (set role to admin, reset the admin's password, overwrite the sign-in settings). All were refused with no effect (role unchanged, admin session intact, no audit entry, settings unchanged). The same "set role" request as an admin succeeded (positive control).

### Accepted risks and known limits (not blocking M1)
1. **File store is for local development only.** Netlify's functions have a read-only, per-instance filesystem. Production needs the Supabase/Postgres adapter behind the existing `Store` interface. Env validation already refuses `STORE=memory` in production. *Tracked task.*
2. **Rate limiting and lockout live in the store.** With the file store they work for one server process. With Postgres they will be shared across instances.
3. **Client IP** comes from platform headers (`x-nf-client-connection-ip`, `x-forwarded-for`). It is used only for throttling and audit, not as a security boundary. The per-IP ceiling is generous because a whole office shares one IP.
4. **CSP** allows `style-src-attr 'unsafe-inline'` (inline `style=` attributes cannot execute script). Script execution is nonce-only with `strict-dynamic`.
5. **Cross-origin Server Action POST returns HTTP 500** (Next.js behaviour) instead of 403. It is blocked either way.
6. **Email lookup and session revocation scan the user/session lists.** Fine for hundreds to low thousands of records; indexed queries arrive with Postgres.
7. **The prototype's default password (`Meristem@2026`) is in the public git history** of `game/auth-config.js`. It must never be used in production. Env validation rejects it as `DEFAULT_PASSWORD`; the prototype in `/game` should be retired or its password changed before it is shared.
8. **No MFA yet.** Optional email-code two-step for admins is in the PRD as a later item.
9. **No CSV import, password-reset-by-email or self-service reset.** By design: the admin resets to the default and the user must change it.

### Findings log
| Date | Finding | Severity | Status |
|---|---|---|---|
| 13 Oct | Store methods threw synchronously on invalid ids instead of rejecting (would bypass `.catch` handlers) | Medium | **Fixed**, covered by a test |
| 13 Oct | Admin functions trusted the actor object passed in | Medium | **Fixed**: actor is re-read from the store; forged and stale actors rejected, tested |
| 13 Oct | A 30-per-10-minute per-IP login cap would lock out a whole office behind one IP | Medium | **Fixed**: ceiling raised to 300; strict limits stay per identifier |
| 13 Oct | `prune()` for rate-limit buckets was a no-op stub | Low | **Fixed**: buckets carry their id; expired ones are deleted |
| 13 Oct | **Security review:** the bootstrap admin (`MS0001`) started on the shared default password that every new joiner knows, so an insider could sign in first, set a password and own the admin account | High | **Fixed**: the admin gets a separate hashed one-time secret (`BOOTSTRAP_ADMIN_PASSWORD`), required in production and different from `DEFAULT_PASSWORD`; 7 new tests |
| 13 Oct | **Security review:** any not-yet-activated staff account can be pre-claimed by someone who knows the shared default password and the victim's staff ID | Medium | **Open (owner decision)**: replace the shared default with per-account activation (one-time code from L&D, or an email code at first sign-in). Until decided, keep the activation window short and watch the audit log for first sign-ins from unexpected IPs |
| 13 Oct | `npm install vitest` failed on a `@types/node` peer conflict | Info | **Fixed** by moving types to `^24` (matches Node 24); no `--force` used |
| 13 Oct | `react-hooks/purity` flagged `Date.now()` in page components | Low | **Fixed** with an `isLocked()` helper |
