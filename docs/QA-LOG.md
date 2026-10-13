# MeriQuest QA and security log

Every change passes the gate in [RULEBOOK §5.1](RULEBOOK.md) before it is committed. Each run is recorded here, with evidence, accepted risks and open items.

---

## M3c.1: Characters like the reference game, and the appearance editor (13 Oct 2026)
Scope: people redrawn with real proportions (legs, shoulders, arms, hands, faces), seven hairstyles, five outfits, four fabrics (plain, Ankara, Adire, Aso-oke), woman and man bodies, bigger on screen; the appearance editor in Me > Profile with a turn-around preview and Save; looks saved on the server. Built from `docs/reference/Character appearance-looks.png` and the Profile screenshots.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 339 passing, including: only offered choices are accepted (hex values, unknown styles, script text and wrong types all rejected), tampered looks heal, older looks still load |
| 3 | Real browser | **Pass** | Throwaway user opened the editor, changed body, hair, outfit, fabric and colour, saved, reloaded: the new look persisted and showed in the world; no console errors; user deleted afterwards |
| 4 | Input validation and authorisation | **Pass** | `saveLookAction` requires a signed-in user and stores only values found on the offered lists, so a crafted request cannot store anything else |
| 5 | Dependencies and secrets | **Pass** | 0 vulnerabilities; nothing sensitive staged |

Note: the palettes and style lists live in `lib/world/looks.ts`, not in admin settings; say if you want them admin-editable.

---

## M3c.2: Conduct concerns, needs and feelings, skills, Today's Plan, person interactions (13 Oct 2026)
Scope: (1) **Report a concern**: staff report conduct concerns to the admin team (kind, who, when it happened, what happened, up to 3 evidence files); the server adds its own timestamps, the reporter's identity, and where in the game they were; admins review at `/admin/concerns` (status, notes, evidence download, audit trail). (2) **Needs engine**: bars fall with time on the server; interactions and coffee raise them; **Feelings** list. (3) **Skills** with levels. (4) **Today's Plan**: three daily missions, rewards and a daily bonus. (5) Person card actions: Say hello, Share a tip, Call for support, Buy a drink (costs Merit points). Everything tunable sits in two new settings: "Needs, interactions, skills and missions" and "Conduct concerns".

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 373 passing (34 new for concerns, 18 for the needs/skills/missions rules and service): file type by contents (scripts, executables, wrong extensions refused), size and count limits, safe file names, hostile text, rate limit, only admins can list/open/download/update, a reporter sees only their own and only the status, tampered stored files refused (hash re-checked), ids that are not real, double claims pay once, cooldowns, costs, rooms and people checked on the server |
| 3 | Real browser | **Pass** | Throwaway player and admin: greeted a colleague (toast, cooldown shown), call for support, feelings and skill bars, missions with progress, reported a concern with a PNG, received CR-0001, a player sent to `/` from `/admin/concerns`, admin saw "1 new report", downloaded the evidence (`200`, `image/png`, `attachment`, `nosniff`, magic bytes intact), saved a review; no console errors; test rows deleted |
| 4 | Authorisation | **Pass** | Concern pages, actions and the download route all require the admin role; `assertAdmin` is repeated inside the service. Interaction/claim actions need a signed-in user, re-check Work First, and take the person and room from the server record, never the browser |
| 5 | Input validation | **Pass** | Strict zod schemas for both settings; ids matched against `^c_[0-9a-f]{18}$`; control characters stripped; lengths capped; dates must be past and within a year |
| 6 | Output / headers | **Pass** | Evidence is served only to admins, as a download, with the real type, `nosniff`, `no-store` and a sandbox CSP; no `dangerouslySetInnerHTML` anywhere |
| 7 | Dependencies and secrets | **Pass** | 0 vulnerabilities; nothing sensitive staged |

Accepted and open:
- Server Actions now accept bodies up to 8 MB (needed for evidence). Only signed-in users reach them, but it is wider than before.
- Evidence is stored in the database (at most 6 MB a report, 5 reports a day per person). Move to object storage with virus scanning before wide rollout.
- Reports are not anonymous: the reporter's name is stored. Say if a confidential option is wanted.
- "Call for support" is built as a colleague interaction that builds Client care and counts for a mission; confirm this is what was meant.

---

## M3b: Eight needs and how to recharge them, floor access and the lift, skip the walk, place cards (13 Oct 2026)
Scope: (1) **Eight needs**: Energy, Focus, Mood, Social plus Hunger, Hydration, Growth and Recognition; the whole status pill opens the Needs tab (not only the badge); every need shows "How to recharge", worked out from the settings and the rooms so it never goes stale. (2) **Recharge spots** (admin-editable): coffee point, water cooler, pantry (lunch), the lounge sofa (quiet break), the bookshelf (read up), plus colleague interactions and mission rewards. (3) **Lift**: stepping into a lift asks which floor, with locks and reasons; **Floor access** setting (Floor 2 closed for now, admins can preview); the same rule is enforced on the server for doors and the map. (4) **Skip**: while the character walks a Skip button (and Space) takes them straight to where they are going. (5) **Place cards**: tapping a room on the Map opens a card with the things to do there, like the reference venue cards. (6) White text on the dark Starting Path card.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 384 passing, including: every need has a way to be recharged and says where; each spot works only in a room that has it, with its own cooldown; floor rules (closed, units, admin preview, unlisted floors open); the server refuses a closed floor even when asked directly by door or by map; nonsense settings rejected; the lifts are the only lift portals; every room is still fully reachable |
| 3 | Real browser | **Pass** | Throwaway player: 8 bars in the HUD; clicking the middle of the pill opens Needs; hunger lists "Pantry · Open-plan floor"; clicking the lift mat shows Skip; Skip lands on the mat and the floor chooser opens; Floor 2 shows a lock and is disabled; Floor 1 travels; the Map place card lists things to do and travels; no console errors; user deleted afterwards |
| 4 | Authorisation | **Pass** | Floor rules are checked in `travelByPortal` and `travelByMap` on the server, not only hidden in the screen; spot and interaction actions check the room from the server record |
| 5 | Dependencies and secrets | **Pass** | 0 vulnerabilities; nothing sensitive staged |

Notes: the new needs start at sensible values for people saved before this change. Place cards list only activities that exist today; more arrive with the rooms the owner describes. Travel options (personal car, pool car, Uber) arrive with Yaba.

---

## M5a: Work Phone, updates, announcements and Meristem Academy with the Culture courses (13 Oct 2026)
Scope: (1) **Work Phone** redesigned like the reference (frame, lock-screen header, announcement banner, coloured app tiles, screens inside the phone). (2) **Messages** with a bell for **Updates** (class over, lesson passed, mission paid, report changed status) and **announcements** from the admin team (new admin page). (3) **Meristem Academy**: groups, courses, lessons with a timed class, then notes, then a quiz drawn from a question bank; **three levels that unlock as you pass** (Easy, Medium, Hard) with the certificate at Hard; pass mark 5 of 7; 2 new classes a day; retry wait; **scenarios** and **case studies**; open to every role, with role courses recommended; also a full page at `/academy`, offered when play is closed (learning is allowed outside hours). (4) **First imported content**: the Culture group (3 courses, 16 lessons, 320 questions across three levels) from the NEO decks; see `docs/ACADEMY-IMPORT.md`.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 409 passing. Academy: the built-in content validates and every lesson has at least 6 questions at each level with no repeated question or option; classes take time and open notes once; one class at a time; classes a day; quiz served without answers, drawn from the level pool with shuffled options; marked on the server; fail waits to retry; bad answers, replays and other lessons refused; Easy then Medium then Hard unlock, points, skill experience and certificate; scenarios and cases; thin levels borrow questions; settings that would break a quiz are rejected. Updates and announcements: private per person, capped, cleaned; only admins post or remove; reporters are told when a concern changes status |
| 3 | Real browser | **Pass** | Throwaway player: phone opens with the 12 apps and the right label sizes; Messages shows the announcement; Academy lists the Culture group with 3 courses; a course shows 5 lessons and the Easy banner; Attend runs a real 30-second class, the lesson changes to "notes ready", notes open, the quiz shows one question at a time and a full quiz was submitted and marked; no console errors; test rows deleted |
| 4 | Authorisation | **Pass** | Every Academy, Messages and Updates action calls `requireUser`; announcements are posted and removed only by admins (checked in the service and in the admin actions); notes and quizzes open only after the class on the server; right answers never leave the server |
| 5 | Input validation | **Pass** | Strict schema for the whole Academy (ids, lengths, answers within the options, a best choice in every scenario); answers must be whole numbers within range and one per question; ids are checked as strings |
| 6 | Dependencies and secrets | **Pass** | 0 vulnerabilities; nothing sensitive staged |

Notes: the quiz marking trusts only what the server stored when it served the quiz (the questions and how their options were shuffled), so a changed question list or a replayed submission cannot change the result. The imported content is draft: HR and Compliance should review it. Concern evidence storage and the other open items are unchanged.

---

## M3a.4: Me panel, person card and shortcuts match the reference (13 Oct 2026)
Scope: the menu button opens a "Me" card like the reference game's (picture and mood on top; Profile, Needs, Goals, Skills, People, Career, Settings tabs); clicking a person opens a player-style card; a keyboard shortcuts card; letter shortcuts M, P, S, E, H and ?; the view turns with [ and ] (E is now "people here"). Built from the reference screenshots in `docs/reference`.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 333 passing, including growth level from points |
| 3 | Real browser | **Pass** | Signed in as a throwaway user: every tab opens, `?` and Esc, `E` lists people, a person opens a card, click-outside closes, the timer counts down in seconds, no console errors; the user was deleted afterwards |
| 4 | Authorisation | **Pass** | No server change; the panel only shows the signed-in person's own data |
| 5 | Dependencies and secrets | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities; nothing sensitive staged |

Provisional: Chat, profile viewing, Say hello, Skills, Feelings and Today's Plan show "Soon" because their systems are not built. Night mode from the reference is left out (light-only brand rule). The level on the Career tab treats points as the XP in the Growth levels setting; to be confirmed.

---

## M3a.3: Full 3D by default, turning the view, clickable world (13 Oct 2026)
Scope: isometric is the default view (2D only when chosen); camera turns in quarter-turns (buttons, Q/E, sideways drag) without moving the player; people, doors and objects such as the front desk are clickable; people open a small card; the play timer counts down in minutes and seconds; every pop-up closes on an outside click or Escape.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 328 passing, including turning (every room, every quarter-turn: walkable tiles, doors, hotspots, click mapping, directions) and the countdown format |
| 3 | Authorisation | **Pass** | No server change. Walking and doors still re-checked on the server; turning the camera is drawing only |
| 4 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |
| 5 | Secrets | **Pass** | None staged |

Known limits: windows, lifts and the logo wall are drawn only on the two back walls, so they disappear when the view turns to put them at the front. The person card and menu layout are provisional until the owner supplies reference screenshots.

---

## M3a.2: The welcome flow matches the reference game (13 Oct 2026)
Scope: after sign-in the home screen is the game itself (as in the reference); the old dashboard moves to `/dashboard`; `/play` forwards to `/`; a skippable five-step welcome tour (Starting Path card, walking, status bars, menu, Work comes first); a menu (dashboard, replay tour, admin, change password, sign out); the tour is remembered per person.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Automated tests | **Pass** | 307 tests in 11 files; new tests for the tour memory (default, finish and skip, idempotent, per person, no record invented, tampered value ignored) |
| 4 | Authz | **Pass** | `completeTourAction` calls `requireUser` and only writes the caller's own record; the page decides placement and Work First on the server |
| 12 | Review | **Pass** | Real-browser test (Edge, throwaway player, removed afterwards): sign-in lands on `/`; the game canvas is the home screen; tour shows with the path card; five steps; finishing closes it; **a reload does not bring it back**; menu items correct; replay works; `/dashboard` works; `/play` goes to `/`; sign-out works; **0 console or page errors** |

Findings
| Finding | Severity | Status |
|---|---|---|
| First browser run showed a 500 on the new save action and a hydration warning | Info | Cause: the dev server was running while a new Server Action was added (stale hot-reload copy). After a restart: 0 errors. Not a code defect |
| Tour text said "a 2 hours break" | Info | **Fixed** ("2-hour") |
| Owner could not sign in: `MS0001` was still on the one-time temporary password (the forced password change had never been completed) and `MS2001` had a password the owner had set earlier, so the long default no longer applied | Info | Dev accounts given a fresh one-time password; verified accepted, wrong password refused. Advice: finish the "Set your password" screen and store it |

---

## M3a.1: Play in working hours with a session limit (13 Oct 2026)
Scope: owner changed the Work First rule: people may play during working hours, max 30 minutes at a time then a 2-hour pause (both admin settings); core-hours closure and play windows become optional; daily cap optional.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Automated tests | **Pass** | 304 tests in 11 files. New `session.test.ts` (21 tests): defaults, countdown, pause and exact resume time, fresh allowance after the pause, unused time kept, custom limits, limit switched off, optional daily cap, blackout, learning exempt, older rule behind the switch, older saved settings still load, the server stops at exactly 30 minutes, **two open tabs cannot double-count**, learning does not use up the session, setting changes apply at once, admin preview credits nothing, a refused beat writes nothing |
| 4 | Authz / server-authoritative | **Pass** | The session is stored and updated server-side in one atomic step per person; the client only displays it. Travel and heartbeat both refuse during a pause (tested). Players do not get the admin preview (tested) |
| 12 | Review | **Pass** | Self-review: no new input surface. Real-browser test with a throwaway *player* in working hours (Tue 11:16): world opens, a 1-minute test session counts down, **"Time for a break" appears with the resume time**, reloading cannot re-enter, the dashboard shows the break; no console errors; test data and the test setting were removed |

Findings
| Finding | Severity | Status |
|---|---|---|
| Switching from learning to the game credited the gap since the last learning beat as game time (could only under-count) | Low | **Fixed**: time is credited only between beats of the same activity (tested) |
| Break message said "1 minutes" | Info | **Fixed** |
| Several old tests encoded the previous default (closed in working hours) | Info | Rewritten: the older rule is still tested, behind `restrictToWindows`, and the new default has its own tests |

Judgement call for the owner to confirm: the earlier approved **45-minute daily cap is off by default**, since it conflicts with several 30-minute sessions a day. An admin can switch it on.

---

## M3a: The game world (13 Oct 2026)
Scope: isometric Ikoyi HQ (lobby, open-plan floor, boardroom, lounge) drawn from scene data; flat 2D Lite renderer; click and keyboard walking with pathfinding; doors and spots; game HUD (clock, mood, points, status bars, venue card, bottom menu); Map with all 8 levels; Work Phone apps (admin-editable); server-checked travel; Work First enforced on the world with an admin-preview setting.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean (production build, 15 routes) |
| 2 | Automated tests | **Pass** | 281 tests in 10 files. New `world.test.ts` (73 tests): geometry, pathfinding, **every scene validated** (inside bounds, no overlapping solids, nobody on furniture, every door and spot reachable from the start, every door has a valid arrival tile and a way back), renderer draws every scene in both modes, click-to-tile mapping, fit on 3 screen sizes, player helpers, travel rules, admin preview |
| 3 | Input validation | **Pass** | Door and room ids are validated as short strings and looked up with an own-property check (`__proto__`, `constructor`, long strings, numbers, null all refused, tested); stored player records are healed (scene, look colours, bars, points) rather than trusted |
| 4 | Authz / server-authoritative | **Pass** | Both travel actions call `requireUser`; the server decides movement: a door must exist in the player's *current* room, and map travel only within the same building (RULEBOOK §2.7); the browser never sends a position or score. Work First is checked on every move |
| 6 | Web security | **Pass** | No raw HTML: all text is rendered by React; canvas text is drawn, not injected; CSP unchanged (script nonces); no new external hosts |
| 8 | Work First | **Pass** | `/play` sends **no world data** when play is closed; travel and heartbeat refuse in working hours (tested); admin preview credits no time (tested); `adminsExempt` can be switched off and then applies to admins (tested) |
| 10 | Dependencies | **Pass** | `npm audit --omit=dev`: 0. New dev-only tools: `@napi-rs/canvas`, `esbuild`, `puppeteer-core` (render and browser checks; not shipped) |
| 12 | Review | **Pass** | Self-review of the new attack surface (two Server Actions, one page, scene data). No findings. Real-browser test (Edge, headless) below |

**Real-browser test (Edge, throwaway admin account, removed afterwards):** sign-in and forced password change; world loads with 517 distinct colours on the canvas; HUD, Map (8 levels), Work Phone (12 apps); click-to-walk moves the character; Map travel to the open-plan floor; walking onto the lift door returns to the lobby; Map travel to the boardroom; 2D Lite toggle; phone-size screen. **No console errors or page errors.**

Findings
| Finding | Severity | Status |
|---|---|---|
| Travel checked Work First against the current clock instead of the time passed in (made tests run "in working hours") | Low | **Fixed**, covered by tests |
| First white logo and invented floor departments (earlier in the day) | n/a | Logo fixed and ruled; **no departments are assigned to any floor** until the owner explains them (RULEBOOK §2.3) |
| On a phone-sized screen the bottom menu wrapped and overlapped the status bars | Low | **Fixed** (labels on one line, spacing) |
| Dev server shows a "Rendering…" badge and compiles an action on first use, so the first Map trip takes a few seconds | Info | Development only |

Known limits: the world is single-player for now (colleagues are scripted characters; real multiplayer is a later milestone); needs bars show saved values and do not decay yet; "Go to work", desk items and the phone apps are marked coming soon; the isometric art is procedural, so an illustrator can replace it with commissioned art later without changing the game logic.

---

## M2.1: Postgres storage adapter (13 Oct 2026)
Scope: `STORE=postgres` adapter over a single `kv` table (any standard Postgres); migration runner and connection check; production env guards; dev database on Prisma Postgres (`meriquestdbase`).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Automated tests | **Pass** | 207 tests in 9 files. New `pg.test.ts` runs the real SQL migration on PGlite (in-process Postgres 17): CRUD, collection separation, 30-way concurrent atomic update, rollback on error, SQL-injection strings stored as plain data, DB-level constraints, RLS on with no policies, and the **whole sign-in, password-change and audit flow on the Postgres adapter** |
| 3 | Input validation | **Pass** | Collection names and ids validated in code and again by `CHECK` constraints in the database; every value is a bound parameter (no string-built SQL) |
| 5 | Secrets | **Pass** | `DATABASE_URL` read only in `env.ts`, never logged; connection and migration errors strip URLs; verified by a test that no error contains the password; `.env.local` is git-ignored |
| 6 | Transport security | **Pass** | TLS certificate and host are verified by default; `sslmode` is stripped and set explicitly; **production refuses `sslmode=disable` and `no-verify`**; live check shows "TLS verified" against `pooled.db.prisma.io` |
| 7 | Secrets scan | **Pass** | No connection string in any tracked file (`git grep` found none) |
| 8 | Server-authoritative / data | **Pass** | Live check on the real database: password hashes are bcrypt, session ids are 64-character hashes (no raw tokens at rest) |
| 10 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities (`pg` added) |
| 12 | Review | **Pass** | Self-review of the diff focused on SQL injection, credential handling, TLS and pooler behaviour: no findings |

Live end-to-end test: production build with `STORE=postgres` against `meriquestdbase`: admin sign-in and forced password change, staff creation, the 7-question placement, dispute and retake, forged-field and forged-admin attempts refused, admin override. Test rows (20) were deleted afterwards; the database is empty.

Findings
| Finding | Severity | Status |
|---|---|---|
| A draft used a server-side `statement_timeout` startup option, which connection poolers (such as `pooled.db.prisma.io`) can reject | Medium | **Fixed**: client-side `query_timeout` instead |
| `store.ts` and `pg.ts` would have imported each other | Info | **Fixed**: shared interface moved to `store-types.ts` |
| Production could silently start on the local-file store on a serverless host, losing data | Medium | **Fixed**: production now refuses `STORE=file` unless `ALLOW_FILE_STORE=true` (tested) |

Known limits
1. **Prisma free plan:** no backups, 10 connections, Frankfurt only (outside Nigeria). Dev with fictional data only. Production provider, plan and region need IT, Risk and DPO approval (RULEBOOK §13, docs/DATABASE-SETUP.md).
2. **Pooled endpoint:** the adapter's transaction lock works through it (checked live), but long transactions are avoided by design.
3. **Single `kv` table:** list and email lookups scan a collection. Fine for hundreds to a few thousand records; reporting tables come later as new migrations.

---

## M2: Placement questionnaire and Work First engine (13 Oct 2026)
Scope: first-sign-in placement questionnaire (dispute and retake; admin can disable globally, per unit or per person; admin override and reset); Work First policy engine with server-side play-time tracking; assigned learning time; `/placement`, `/play` and `/admin/placements`; admin-editable `placement` setting and Work First `publicHolidays` / `duringCoreHours`.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean; 13 routes |
| 2 | Automated tests | **Pass** | 190 tests in 8 files (new: 33 Work First, 30 placement) |
| 3 | Input validation | **Pass** | Answers validated strictly against the configured questions (no extra keys, no prototype keys, no client-supplied path or score); placement settings cross-validated (unknown path ids, duplicate ids, score ranges, hint ranges); dispute note capped at 300 chars |
| 4 | Authn / authz | **Pass** | Every new Server Action starts with `requireUser`/`requireRole`; admin placement and learning-assignment operations re-read the actor from the store; managers may assign only within their own unit and never to themselves |
| 6 | Web security | **Pass** | Questionnaire sends only question text and option labels to the browser (scores and path ids stay on the server) |
| 8 | Server-authoritative | **Pass** | Path, scores and retake permission are computed on the server; play time is credited from real elapsed time between server-received heartbeats (gap capped at 90 s, backwards clocks credit nothing, credit stops at the cap); retake limits are checked atomically against the stored record, so parallel tabs cannot exceed them |
| 10 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |
| 12 | Review | **Pass** | `/security-review`: no high-confidence findings. Live checks on a production build: 7-question flow, dispute and retake, a form with forged `pathId`/`scores` fields ignored, a player's forged admin set-path refused, admin override sticks and locks retakes |

Findings
| Finding | Severity | Status |
|---|---|---|
| Default placement option ids (`1-3`, `8-plus`) broke the slug rule, so the default failed its own schema | Medium (blocked every placement) | **Fixed** (caught by tests) |
| The lunch window sat inside core hours, so the engine closed it as "core hours" and lunch play could never open | Medium (policy) | **Fixed**; then found that letting any window beat core hours would open a 07:00 window inside a trading floor's 06:00 start, so only windows flagged `duringCoreHours` (lunch) may open inside core hours |
| Live smoke test failed to sign anyone in | Info | Cause: the production guard correctly refused `SEED_SAMPLE_STAFF=true`. The test now creates its player through the admin console |
| Smoke-test folder `.data-smoke/` was not git-ignored | Low | **Fixed**: ignore `.data*/`; folder deleted before commit |

Observations (not vulnerabilities)
1. **Work First is not yet enforced on game content**, because there is no game content yet (`/play` is a placeholder). When the isometric world and shifts arrive, every server action that starts a shift or loads world data must call `playStatus` and refuse when play is closed. Tracked for M3/M4.
2. **Placement is self-reported**, so someone could pick answers that put them on the Seasoned path. Directory hints cross-check tenure and admins can override. Anything gated by path (the leadership simulator) must also check the person's profile (line manager flag, tenure), not only the path.

---

## M1.1: Brand, prototype retirement and Supabase guide (13 Oct 2026)
Scope: Meristem palette and logo applied (login, top bar, error pages); `/game` prototype retired; Netlify now publishes a static "retired" page; Supabase setup guide; rulebook decisions recorded.

| Gate | Result | Evidence |
|---|---|---|
| Build, types, lint, tests | **Pass** | `npm run qa`: 124/124 tests, typecheck, lint and build clean |
| Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |
| Secrets | **Pass** | The prototype's old default password was removed from `game/auth-config.js` (it stays in git history; it must never be reused). No secrets in the new files |
| Web security | **Pass** | Only `/brand/*` was exempted from the sign-in redirect (public logo files). Verified on a production build: `/admin` and `/` still 307 to `/login` when signed out; path traversal out of `/brand/` is redirected, not served; no directory listing |

Findings
| Finding | Severity | Status |
|---|---|---|
| The sign-in page logo failed (HTTP 500) because the proxy redirected unauthenticated `/brand/*` requests | Low (functional) | **Fixed**: `/brand/` exempted from the proxy matcher; logo served directly (no image optimizer in the path) |
| `next build` failed with `EPERM` on `.next` (OneDrive file lock on build output) | Info | Worked around by clearing `.next`; consider moving the repo out of OneDrive for builds |
| `netlify.toml` still published the retired prototype | Medium | **Fixed**: publishes `/retired` (static notice) until the production deploy exists |

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
