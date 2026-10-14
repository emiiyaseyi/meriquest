# MeriQuest Rulebook

**Status:** v1.0, 13 October 2026. Owner: Michael Adeniran (product owner).
**Purpose:** the single source of truth for what MeriQuest is and how it is built. Anyone building it, human or AI, follows this file. If a request, a doc or the prototype conflicts with it, **this file wins** until the owner changes it.

---

## 0. How this rulebook works

1. **Read this before any task.** `CLAUDE.md` points here so it is loaded every session.
2. **Locked decisions (§2) change only when the owner says so**, in plain words. Silence, a hint or a pasted reference is not approval. When the owner changes a decision, update §2 and add a line to the Decision Log (§12) in the same change.
3. **No silent deviation.** If the work needs something this file does not cover, or seems to contradict it, stop and ask. Do not improvise a new feature, rename a concept, change a number or "improve" a decision.
4. **Scope discipline.** Do only what was asked. Docs first, prototype second: do not edit `/game` until the owner asks for it.
5. **Nothing hardcoded that an admin may want to change** (§4). Defaults are seeded, never baked in.
6. **Report honestly.** Say what was done, what was skipped, and what is unverified.
7. **Where a rule is marked OPEN (§13), do not decide.** Ask.

---

## 1. What MeriQuest is

A multiplayer **life-simulation learning game** for Meristem Securities Limited and its subsidiaries, modelled on the *experience* of Lagos Life (a shared, walkable, Sims-style world with jobs, needs, skills, courses, missions, stories and real people). It teaches **technical and soft skills together** in realistic Meristem situations, measures them, and feeds development and **succession planning**.

It is a **workplace learning tool**. It is internal only, uses fictional data only, and never decides pay, ratings or pass/fail (development use only).

Name: **MeriQuest** (working title). Level metaphor: Seed → Sprout → Stem → Branch → Canopy.

---

## 2. Locked decisions

### 2.1 Work comes first, with limited play sessions
> **Changed by the owner on 13 Oct 2026.** The earlier rule closed the game during core working hours and allowed play only in set windows. The owner replaced it: **people may play during working hours, but only in limited sessions.** The earlier rule is kept as an optional setting (`restrictToWindows`), off by default.

**The current rule (default)**
- **Session limit:** a person may play for a maximum of **30 minutes at a time**. When the 30 minutes are used they must take a **2-hour pause** before the next session. Both numbers are **admin settings** (Admin → Settings → Work First policy → session limit: on or off, maximum minutes, pause minutes).
- **How the allowance works:** the server counts real play time. Stopping early keeps the unused minutes. Staying away for the full pause length gives a fresh allowance. Two open tabs cannot double-count time or skip the pause. The break screen shows when play reopens.
- **Working hours and play windows are not enforced** by default. An admin can switch the old behaviour back on (`restrictToWindows`): closed in core hours, open only in the play windows.
- **Daily cap:** the earlier 45-minute weekday cap is **off by default**, because it would conflict with several 30-minute sessions a day. An admin can switch it on (`dailyCapEnabled`). The weekly nudge (4 hours) stays as a gentle warning only.
- **Blackout periods** (month-end, audits and similar) still close play if an admin schedules them. None are set by default.
- **Learning** (Academy, simulator) is open at any time and does not use up the play session.
- **Admins** may preview the game at any time (`adminsExempt`, on by default, admin-editable). Nothing is credited for a preview.
- No streak, mission, leaderboard or event may pressure someone to play. Streaks pause on leave and weekends.
- Managers see **aggregate** participation only (not click-level time).
- Defaults are seeded by Group HR/L&D and can be changed by an admin without a code release.

**Settings kept from the earlier rule** (used only when `restrictToWindows` is on, or for caps and blackouts)
- **Learning outside work hours (owner, 13 Oct 2026):** Academy lessons, courses and the leadership simulator may be done outside work hours. The owner's list of other activities allowed outside the windows was cut off; see §13 item 2.
- **Earlier defaults (approved 13 Oct 2026; every value is admin-editable, by unit, role or person):**
  - **Core working hours (no play):** Mon–Fri 08:00–17:00 (per-unit override, e.g. trading-floor and contact-centre shifts).
  - **Play windows:** before work 07:00–08:00; lunch 12:30–13:30 (max 30 min used); after hours 17:30–21:00; weekends and public holidays 09:00–20:00 (voluntary).
  - **Daily cap:** 45 min on a workday (nudge at 30 min, hard stop at 45); 90 min on a weekend day. **Weekly soft cap:** 4 hours.
  - **Assigned learning time:** a manager or L&D may assign up to 2 hours a week inside core hours (e.g. one 45-minute Academy block). This is the only play allowed in core hours.
  - **Blackout periods** (admin-scheduled, no play outside assigned learning): month-end, quarter-end, year-end close, results and AGM season, regulatory filing deadlines, audits.
  - **Pause:** one tap, no penalty. Auto-away after 3 minutes idle. Outside a window the game shows a "Work first" screen (profile, certificates and reports stay viewable).
  - **Streaks:** count only check-ins made inside play windows; pause on weekends, public holidays and leave; one free "streak freeze" a week.
  - **Reporting:** aggregate only; never click-level time per person.

### 2.2 Look and feel (phased)
| Phase | Rendering | Notes |
|---|---|---|
| **Build 1** | **Isometric (2.5D) look**: low-poly style, rotating or fixed isometric camera, walkable scenes, drawn/illustrated assets | Reference: Lagos Life's isometric home and venue scenes |
| **Lite mode** | **2D illustrated art** of the same places | Automatic on slow network, data saver or small phone; user can force it. All features must work in Lite |
| **Later build** | Real **3D** world | Evaluated after Build 1; not in scope now |

### 2.3 Places
- Offices (the "worlds"): **Lagos Ikoyi HQ**, **Lagos Yaba**, **Abuja**, **Port Harcourt**.
- The player's personal space is the **Workspace** (a desk/pod in their own office). **Never use the word "house" or "home" for it.**
- **Ikoyi HQ must match the real building and office look and feel** (reference: `docs/reference/Meristem Office Screenshots/`): glass-and-concrete facade with boxed windows; double-height lobby with the moss wall and Meristem logo, wood-slat panelling, reception desk, turnstiles, marble floor with dark inlays, branch-style chandelier; open-plan floors with white desks, **green partitions** and mesh chairs; oval boardroom; lounge/executive suite; lift lobby.
- **Ikoyi HQ levels (owner, 13 Oct 2026):** the building has **Ground floor, Mezzanine floor and Floors 1 to 6** (8 levels). The owner will explain what each level is for. **Until then, do not assign departments, teams or functions to any floor.** Rooms already built (lobby on the ground floor; open-plan floor, boardroom and lounge) are *sample layouts* labelled as such. The lift panel and the Map show all 8 levels, and only built rooms are open. The same applies to the Yaba office once its photos are supplied.
- **Reference photos are for the illustrators only.** They contain third-party marks (contractor watermarks, a building sign, a social-media player UI). **No third-party watermark, sign or UI may appear in the game.** Game art is redrawn from the reference, not copied. Meristem logo use requires Corporate Communications approval.
- **Build 1 is Lagos only (Ikoyi HQ and Yaba).** Abuja and Port Harcourt are deferred to a later build (owner, 13 Oct 2026). Yaba, Abuja and Port Harcourt need their own reference material from the owner before any art is made. Do not invent their look.

### 2.4 Starting placement (replaces Lagos Life's Nepo/LAPO lottery)
- On **first sign-in**, every user completes a **short questionnaire**. Their answers place them on a **Starting Path**.
- Paths (names may be adjusted by the owner): 🌱 **Fresh Start** (interns, entry level, graduate/MSP), 🔄 **New Chapter** (experienced hire new to Meristem), 🌳 **Seasoned** (long-serving staff and team leads, 8+ years). A leader/executive path is OPEN (§13).
- The user may **dispute the placement and retake** the questionnaire. **An admin can disable dispute/retake** (globally, by group or per person). Admin can also override a placement. All placements and disputes are audit-logged.
- Questions, scoring, path rules and thresholds are **admin-editable** (§4). Staff directory data (grade, unit, tenure) can pre-fill or cross-check answers.
- Placement never relies on luck and never gives "privilege". Paths differ in content and pacing, not in fairness.

### 2.5 Terminology (use these words)
| Lagos Life | MeriQuest |
|---|---|
| House / home | **Workspace** |
| Lagos / Abuja / Port Harcourt | **Ikoyi HQ / Yaba / Abuja / Port Harcourt** |
| Naira (Game Naira) | **Merit points** (non-transferable, no cash value) |
| Sparkles | **Spark** (second currency for perks and cosmetics) |
| Nepo / LAPO / UNILAG Fresher | **Starting Path** (§2.4) |
| Phone | **Work Phone** |
| UNILAG Short Courses | **Meristem Academy** |
| Lagos Stories | **Meristem Stories** |
| Lagos Rep | **Meristem Rep** (rank names set by admin, e.g. growth-themed) |
| Today's Hustle | **Today's Plan** |
| Gem hunt | **Daily Discovery** (riddle on Group products/places) |
| Oga / Jaguda work styles | Professional equivalents (§2.6) |
| Feelings (moodlets) | **Moods** (e.g. "Praised by MD") |
| Perks | **Boosts** |
| Wishes / Lifetime Dream | **Aspirations** / **Career Dream** |
| Crime, jail, casino, betting | **Not included** (see §3) |

### 2.6 The work shift (modelled on Lagos Life's "Go to work")
Reference: `docs/reference/go to work shift screenshots/`. Flow:
1. Player taps **Go to work**. A shift panel shows role, office, start time, "no pay yet, stay N min", performance %, "0/4 tasks, +15% at 4".
2. **Commute** (only where §2.7 says there is travel), arrival at the gate and security, then into the office.
3. **Morning brief** with the line manager.
4. **Pick a work style** for the shift (five, admin-editable; professional versions of Do Your Work / Work Like Jaguda / Gist / Suck Up / Take Am Easy).
5. **Tasks arrive** as decision cards and mini-games. Choices include **do it hands-on** or **pass it to a named colleague (safe bet)**. A colleague "watches". Random workplace events interrupt (e.g. power cut, system outage, urgent client, surprise audit).
6. **Mini-games** (6 types, §7.3), timed, e.g. sequence the steps in order within 7 seconds.
7. Early arrival gives a small bonus; **leaving early = no pay and a performance hit**. Completing 4 tasks gives +15%.
8. **End-of-shift settlement**: tasks handled, performance, Merit points, coach's note, Updates-feed entries.
9. Camera options during a shift: **My desk / Floor / Boss view**; commute camera: **Chase / Side / Inside**.

Assessment rule: scores for development use the **quality of the decision**, not the dice. Chance may colour the outcome but never the assessment.

### 2.7 Travel rule
- **No travel step for moving around inside a building, between floors, or between teams in the same office.**
- A **travel step happens only when**: (a) the player moves between **Lagos offices that need a drive** (Ikoyi HQ ↔ Yaba), or (b) goes to a **client's office or home**.
- Choice of transport (admin-editable list and costs): **personal car**, **official pool car**, or **ride-hailing (e.g. Uber)**. Each has time, cost, availability and consequences (traffic, rain, pool-car booking and approval, policy rules on personal vehicle use, safety).
- **Inter-city travel is out of scope for now.** Build 1 is Lagos only; Abuja and Port Harcourt (and travel to them) come in a later build.

### 2.8 Wealth-building and client service (the heart of the Meristem version)
Meristem is an investment and wealth management group. Staff do two things in the game:
1. **Build their own wealth with Meristem's own products and services** (simulated personal portfolio, fictional money). Personal dealing rules apply (§2.9).
2. **Offer those same products and services to clients**, simulated to match the staff member's **role and experience**.

**Client simulation (must be detailed):**
- **Client types:** individuals and **corporate organisations** (treasury teams, pension schemes, cooperatives, family offices, institutions).
- **Behaviour archetypes** (admin-editable, mixable with mood, tier, channel, location, urgency), for example:
  - Many questions, many calls, **invests little or nothing**.
  - Few questions, **invests large amounts**.
  - Price-sensitive, comparison shopper, impatient, anxious, sceptical, loyal, well-informed, first-time investor, hostile or upset.
  - Corporate: committee-driven, slow procurement, tender/RFP, needs due diligence documents.
- **Outcomes depend on** the staff member's product knowledge, suitability work, KYC/AML hygiene, communication, follow-up, compliance with rules, and **the client's personality fit**, plus controlled randomness. A perfect pitch can still lose a client; a rushed one can win but breach a rule (and the breach is recorded).
- **Client ratings:** every interaction can generate a client rating (CSAT), NPS and written feedback; ratings feed the player's profile, Meristem Rep and the manager's development view.
- **eNPS:** the game runs periodic **employee NPS pulses** (admin-scheduled, anonymous in aggregate) so the organisation can see staff sentiment. Individual responses are never shown to managers.
- Existing prototype pieces (Client Desk, 7 channels, 4 personalities, 4 moods, 4 tiers, 39 locations, Performance Index) are the starting point, not the limit.

**Market simulation (must be detailed):**
- Fixed income (FGN bonds, treasury bills, corporate bonds, sukuk, Eurobonds), money market, equities (NGX), mutual funds and unit trusts, and the macro drivers that move them: MPC rate decisions, inflation prints, FX moves, auctions, issuance, results and AGM seasons, regulatory announcements.
- Market states (calm, rally, selloff, rate shock) are **event-driven and admin-schedulable**, so L&D can run a "rate hike week". All prices and yields in the game are **fictional but plausible**, never live data and never advice.

### 2.9 Regulators and control functions (make it huge)
The world must include the **regulators and the control functions** that shape daily life at Meristem. Treat the list as a configurable library (§4); the starting set below must be confirmed by Group Compliance.

- **Regulators and market bodies: include ALL relevant regulators (owner, 13 Oct 2026).** Starting library, to be validated and extended by Group Compliance and kept admin-managed: **SEC** (capital market conduct, sponsored individuals, advisers, dealing), **NGX** (listing and trading rules), **CBN (a major regulator for Meristem Finance Limited, MFL)**, **FMDQ**, **CSCS**, **NDPC** (data protection, NDPA 2023), **CAC**, **NDIC**, **NFIU**, **EFCC**, **FCCPC** (consumer protection), **NITDA**, the **tax authority (FIRS/NRS)**, the **Investments and Securities Tribunal**, and international standards bodies that shape local rules (**FATF**, **IOSCO**). Each regulator has its own rules pack, inspections, returns and penalty scenarios. Any entry Compliance cannot confirm is marked "unverified" and not used in assessed content.
- **Control functions as playable roles and counterparties:** **Compliance, Risk Management, Internal Audit / Control, Information Security, Data Privacy (DPO)**, Legal, Finance, Operations. Players meet them as colleagues, get reviewed by them, and can *be* them on the Control & Governance tracks.
- **Scenario families (each with admin-managed packs):** KYC/AML and suspicious transaction reports; suitability and conflicts of interest; market abuse and insider information; **personal account dealing** (pre-clearance, restricted list, holding periods, gifts and entertainment); complaints handling; marketing and communication approval; regulator inspections and returns; internal audit findings and remediation; risk events and incident reporting; **phishing, access control and data-leak incidents**; **data subject requests and breach notification**; whistleblowing; business continuity (power, network, vendor failure).
- Consequences are **learning consequences** (warnings, remediation tasks, a visible compliance standing), never real HR action.
- Every scenario that touches regulation or conduct needs **SME + Compliance approval** before publishing (PRD §12).

### 2.10 Leadership simulator and succession planning
**For Seasoned staff (8+ years / leads), and for everyone above 3 years of service in Meristem:**
1. A **leadership simulator** presents scenarios (coaching, delegation, conflict, change, crisis, ethics, stakeholder pressure, performance management, talent, retention).
2. The player's choices build a **leadership profile** (admin-defined dimensions).
3. The system **recommends growth areas** and a **personal development plan** made of: **books** (linked to the Meristem e-library where available, otherwise reputable online sources), **courses** (from the Meristem **LMS**, or courses created in-game), **audio/podcasts**, and stretch assignments.
4. **Succession planning:** readiness for the next role (e.g. Ready now / 1–2 years / 3+ years), role-critical competencies, successor slates for critical roles, 9-box style talent view, development actions tracked over time.
5. Staff above 3 years are **prepared for succession** through the same engine at the level suited to their grade.
- All resources, dimensions, thresholds and recommendation rules are **admin-managed**. Results are for **development and talent conversations**, not ratings or pay. Visibility to managers and HR is set by policy (§4).
- **Content (owner, 13 Oct 2026):** build and use **our own content** (books summaries, courses, audio scripts, scenarios). The Meristem **LMS and e-library** links are added later by an admin when the owner provides access; until then the resource library holds our own items and empty "link-out" slots.
- **Who gets the simulator (owner, 13 Oct 2026):** it is **mandatory for line managers**, and **an admin sets who counts as a line manager from their profile**. Everyone else **unlocks access as they grow in the game** (admin-set unlock rule, e.g. level, Rep or tenure over 3 years). Who may *see* a person's results beyond the person themselves (manager, HRBP, talent committee) is still OPEN (§13).

### 2.11 Multiplayer and safety
- Shared world with **real-name staff accounts only**. No anonymous accounts, no transferable currency, no money gifts.
- Moderated chat with filters, report/block, PII detection, retention policy, moderator console. "Invisible" mode available.
- Lagos Life lessons we avoid: scam and begging messages, runaway economy, unmoderated links.

### 2.12 Learning content model (from Lagos Life)
- **Meristem Academy:** courses of 5 lessons; each lesson is a timed class → notes → **quiz of 7 questions, pass at 5 of 7**; fail = read again, retry after a short delay; **max 2 lessons per day** (admin-editable); certificate + boost + Spark on completion.
- **Meristem Stories:** narrative quests tied to places, with ethical dilemmas and Rep rewards.
- **Today's Plan:** 3 missions (easy / out-and-about / work) with one free swap, a finish-all bonus, a 7-day streak that **pauses on leave**.
- **Skills** level to 10 and can rust if unused (admin-editable).

---

**Business scope (owner, 13 Oct 2026):** Meristem is **not in pensions or insurance**. Do not build pension-fund or insurance products, regulators (PenCom, NAICOM), scenarios or career tracks. A client may still be an institution that invests, but Meristem does not sell or regulate those lines.

---

## 3. Hard exclusions (never build)
- Real money, purchases, ads, top-ups, pay-to-win.
- Crime, jail, police raids, casino, betting.
- Anonymous chat, transferable currency, open public posting.
- Real client data, live market data, or anything that could be read as investment advice.
- Random "privilege" starts.
- Using data to set pay, ratings or MSP pass/fail.
- Third-party watermarks or marks in game art.

---

## 4. Admin-configurable, never hardcoded
Anything below must live in the database or config with an **admin screen**. Code may ship **seeded defaults** only.

- Work First policy: play windows, daily cap, learning hours, leave/weekend pause.
- Starting-path questionnaire: questions, answers, scoring, path rules, dispute and retake on/off, override.
- Tracks, scenarios, quizzes, courses, lessons, Stories, missions, riddles.
- Client library: archetypes, case templates, moods, tiers, channels, locations, rating rules.
- Product and service catalogue, fictional prices and yields, personal-dealing rules.
- Market scenarios and event calendar.
- Regulators, rules, control-function packs, compliance thresholds.
- Work styles, task pools, mini-game parameters, shift length and pay, bonuses, performance rules.
- Transport options, costs, policies and delays.
- Offices, venues, floor layouts, art packs, Lite-mode rules.
- Needs/energy rates, Moods, Boosts, skill levels, rust rule, Rep ranks.
- Merit points and Spark rates, daily lesson cap, streak rules.
- Leadership dimensions, recommendation rules, **resource library** (books, courses, podcasts, LMS links), succession roles, readiness bands.
- Chat rules, keyword lists, retention, moderation roles.
- eNPS schedule and questions.
- Staff directory, roles (staff / manager / admin / reviewer), permissions, default password policy.
- Text, labels and names (including the terminology table in §2.5).

---

## 5. Architecture rules
- Stack per PRD §10 (Next.js + TypeScript, Vercel (owner decision, 13 Oct 2026), Supabase, server-side staff ID/email + password). **Server-authoritative scoring.**
- Rendering: PixiJS (or similar) for isometric scenes; shared game logic is renderer-independent so Lite 2D and later 3D reuse it.
- Content is data, not code. One content schema serves isometric, Lite and later 3D.
- Accessibility (WCAG 2.2 AA), mobile-first, under 300 KB first load in Lite.
- All learning events logged as xAPI.

---

### 5.1 QA and security gate (permanent, owner instruction 13 Oct 2026)
Every piece of code is QA'd and security-checked **before it is committed**. A change that fails any gate is fixed, not committed. The gates:
1. **Build and types:** `npm run build` and `tsc --noEmit` pass with zero errors. Lint passes with no errors.
2. **Automated tests:** unit tests for all business logic (auth, lockout, Work First, placement, config validation, permissions). Tests must pass. New logic ships with tests.
3. **Input validation:** every server input (forms, API routes, server actions) is validated with a schema (zod) with length and type limits. Never trust the client.
4. **Authentication and authorisation:** server-side checks on every protected route and action (player / manager / admin / reviewer). No security by hiding buttons. Deny by default.
5. **Passwords and sessions:** hashed with a slow hash (bcrypt), never logged or returned; default password only from server env, never in code or client bundle; signed, `HttpOnly`, `Secure`, `SameSite` cookies with expiry; rotation on login and password change; lockout and rate limiting; generic error messages.
6. **Web security:** CSRF defence (same-site cookies plus origin checks on state-changing requests), security headers and a strict CSP, no `dangerouslySetInnerHTML` on user input, output escaping, no open redirects, safe file handling, no SSRF.
7. **Secrets:** none in the repo or the client bundle; `.env*` ignored; a secret scan before each push.
8. **Server-authoritative scoring:** the client can never set its own score, level, points, role or placement.
9. **Data safety:** least-privilege data access, audit log for admin and security events, no real client data, no PII in logs.
10. **Dependencies:** `npm audit` reviewed; no known high or critical vulnerabilities left unaddressed; pinned lockfile committed.
11. **Error handling:** no unhandled errors, no stack traces or internals shown to users, friendly error pages, graceful failure when storage is unavailable.
12. **Review:** a security review of the diff (`/security-review`) and a self-review against this list before each commit. Findings are fixed or recorded in `docs/QA-LOG.md` with the reason.
Results of each gate run are recorded in `docs/QA-LOG.md`. "It works on my machine" is not a pass.

---

## 6. Content rules
- Fictional people, clients, numbers and companies. No real client or staff data.
- Local flavour, Nigerian English and humour are welcome; keep it professional and respectful.
- Every scenario carries: version, review date, SME, Compliance approval status.
- Real Meristem facts (products, policies, org structure) must be **supplied or confirmed by the owner or SMEs**. Do not invent policy.

---

## 7. Gameplay reference summary (what Lagos Life does that we mirror)
### 7.1 Screen layout
Top bar (clock, mood, players online, wallet) · left (daily reward, discovery, needs) · bottom nav **Home (Workspace) / Buy / Map / Phone** · right (camera, shortcuts) · persistent **Go to work** and transport picker.
### 7.2 Venues
Each venue is a scene with real players, a chat box for people present, sub-location tabs, activity cards (duration, cost or earn, stat tags, time-window locks), an ambient news line, player shops, and a share link.
### 7.3 Mini-game types
`sortSwipe`, `sequence`, `tapTargets`, `holdRelease`, `keepInZone`, `timingBar`. Meristem uses: KYC document sorting, trade-settlement ordering, phishing spotting, T-bill pricing, suitability balancing, order timing.
### 7.4 Profile tabs
Profile · Needs (+ Moods) · Goals (Career Dream, Aspirations, Certificates, Boosts) · Skills · People · Career · Settings.
### 7.5 Phone
Work Phone apps (all admin-togglable): My Role, Messages, Meristem Academy, Directory, Kudos, My Portfolio, Clients, Market, Compliance Desk, Reports, Settings.

---

## 8. Documents and their roles
| File | Role |
|---|---|
| `docs/RULEBOOK.md` | This file. Rules and locked decisions |
| `docs/PRD.md` | Requirements; must agree with this file |
| `docs/WORKPLAN.md` | Phases and milestones |
| `docs/LAGOS-LIFE-REVIEW.md` | Reference analysis (being corrected, see §10) |
| `docs/CAREER-TRACKS.md`, `docs/CLIENT-SIMULATION.md` | Content design |
| `docs/reference/` | Screenshots of Lagos Life and the Ikoyi HQ (illustrator reference only, internal) |
| `game/` | Prototype v0.1. **Do not modify until the owner says so** |

If two docs disagree, this rulebook wins, then PRD, then the rest.

---

## 9. Build order (guide, owner may reorder)
1. Update docs to this rulebook (review, PRD, workplan).
2. Data model and **admin console** skeleton (§4).
3. Sign-in, **placement questionnaire**, Work First policy.
4. Ikoyi HQ workspace and lobby scenes (isometric + Lite).
5. Work shift loop with decision cards and mini-games.
6. Meristem Academy and Stories.
7. Client and market simulation, personal portfolio.
8. Regulator and control-function packs (Compliance first).
9. Leadership simulator, recommendations, succession planning.
10. Multiplayer presence and chat, moderation.
11. Yaba, Abuja, Port Harcourt offices.

---

## 10. Backlog of doc changes owed (from the 13 Oct review)
- [ ] Rewrite `LAGOS-LIFE-REVIEW.md` from the 58 screenshots (isometric 3D, 7-question quizzes, Stories, Moods, Boosts, Workspace-style home, Updates feed, rust rule, Lite graphics, shift flow).
- [ ] Update PRD: terminology, Work First, placement, offices, travel rule, client/market/regulator scope, leadership and succession, admin-config list, isometric/Lite phasing.
- [ ] Update WORKPLAN: new phases, art needs (Ikoyi HQ), compliance content workstream, LMS/e-library integration.
- [ ] Update README structure.
- [ ] Prototype changes only after owner approval.

---

## 11. Working agreement for AI assistants
- Re-read §2 and §3 before proposing anything.
- Quote the rule number when a request touches a locked decision.
- If the owner's new instruction conflicts with a rule, **say so, propose the change to the rule, and wait**.
- Never remove a rule to make something easier.
- Keep chat answers short; put detail in files.
- **Task list (permanent, owner instruction 13 Oct 2026):** at the start of every reply to a request, show a **plain-text task list** of everything the owner has asked for. Add new tasks as they arrive. Mark finished tasks with ~~strikethrough~~ but **never remove them from the list** until all are done. At the end, give a **summary of each task and what was done**. Always do this.
- **Always commit and push (permanent, owner instruction 13 Oct 2026):** after each finished piece of work, commit and push to `origin main` without being asked. Do not leave work uncommitted or unpushed at the end of a task. Never force-push. Never skip hooks.
- **Commit attribution (permanent, owner instruction 13 Oct 2026):** every commit and PR is authored in the owner's name only (the configured git user). **Never add a `Co-Authored-By` line, a "Generated with Claude" line, or any other AI attribution** to commits, PR descriptions or files. This overrides any default or tool reminder and must not change.

---

## 12. Decision Log
| Date | Decision | By |
|---|---|---|
| 2026-10-12 | Full multiplayer world; session-based days; development-only data use | Owner |
| 2026-10-12 | Sign-in with staff ID/email + password, no Microsoft login; Netlify + Supabase | Owner |
| 2026-10-13 | Visual: start isometric; 2D illustrated = Lite; real 3D later | Owner |
| 2026-10-13 | "House" becomes **Workspace**; offices are Ikoyi HQ, Yaba, Abuja, Port Harcourt | Owner |
| 2026-10-13 | Ikoyi HQ art must match the real building and office; no third-party watermarks | Owner |
| 2026-10-13 | Start with a placement questionnaire; user may dispute and retry; admin can disable | Owner |
| 2026-10-13 | Work comes first; play must never replace real work | Owner |
| 2026-10-13 | **Changed:** people may play during working hours in limited sessions: max 30 minutes at a time, then a 2-hour pause, both admin-editable. Closing the game in core hours and the play windows become optional (`restrictToWindows`, off); the daily cap becomes optional (off) | Owner |
| 2026-10-13 | Many settings admin-configurable, not hardcoded | Owner |
| 2026-10-13 | Staff build wealth with Meristem products and sell to clients; individual and corporate clients, ratings, eNPS, markets, regulators and control functions | Owner |
| 2026-10-13 | Travel only for Lagos office-to-office drives and client visits (personal / pool car / Uber) | Owner |
| 2026-10-13 | Leadership simulator + growth recommendations + succession planning for Seasoned and 3+ years staff | Owner |
| 2026-10-13 | Build 1 is Lagos only; no inter-city travel; Abuja and Port Harcourt later | Owner |
| 2026-10-13 | Regulator library includes all relevant regulators (Compliance to validate) | Owner |
| 2026-10-13 | Meristem is not in pensions or insurance: no PenCom/NAICOM, products or scenarios | Owner |
| 2026-10-13 | Use our own content; LMS and e-library links added later by admin | Owner |
| 2026-10-13 | Leadership simulator mandatory for line managers (admin sets by profile); others unlock as they grow | Owner |
| 2026-10-13 | Standing practice: show a plain-text task list each reply, strike done items, end with a summary | Owner |
| 2026-10-13 | Work First defaults approved; learning may also happen outside work hours | Owner |
| 2026-10-13 | Production build: install Node, new Next.js + TypeScript app in `/app`; `/game` untouched until parity | Owner |
| 2026-10-13 | Always commit and push after each piece of work | Owner |
| 2026-10-13 | Database: any standard Postgres via `DATABASE_URL`; dev on Prisma Postgres (`meriquestdbase`, Frankfurt, free plan, fictional data only); production provider, plan and region decided with IT, Risk and the DPO before the pilot | Owner |
| 2026-10-13 | QA and security gate (§5.1) on everything built: no loopholes, no errors | Owner |
| 2026-10-13 | Ikoyi HQ has Ground floor, Mezzanine floor and Floors 1 to 6; owner will explain each; no floor use invented meanwhile | Owner |
| 2026-10-13 | Admins may preview the game at any time (`adminsExempt` Work First setting, on by default, admin-editable) | Owner / Claude |
| 2026-10-13 | The game looks and plays like the Lagos Life reference: isometric world, floating HUD, Map, Work Phone; light-only | Owner |
| 2026-10-13 | Account activation: keep the shared default password and accept the risk (option c) | Owner |
| 2026-10-13 | Apply the Meristem brand (logo, palette) from the staff-portal reference | Owner |
| 2026-10-13 | Owner asked for recommendations on §13 items 2, 4, 7, 8, 9, 10; working defaults recorded | Owner / Claude |
| 2026-10-13 | The `/game` prototype is retired: password removed, Netlify publishes a "retired" page | Owner / Claude |
| 2026-10-14 | The Workspace shows the person's **desk**, not the whole room. Desk size grows with role and experience (admin-set layouts). Only chosen people (for example Heads of Business Units, the COO and CFO) have a **private office**, which they set up and which is then their Workspace view. Who gets which is admin-set (job titles, staff ids, years, line-manager flag) | Owner |

---

## 12.1 Brand look and feel (owner, 13 Oct 2026)
Reference: `docs/reference/meristem look and feel/` (the staff portal at meristudy.meristem.com.ng).
- **Palette:** forest green `#2d5d41` for navigation and buttons; lime `#8db74e` for the active tab; sign-in gradient `#2f6244` to `#1d452b` with a pale card `#ebf1ed`; page `#f7f8f7`; alert tint `#fcf3f2`. Defined as CSS tokens in `app/src/app/globals.css`.
- **Logo:** the Meristem wordmark with the leaf, white on green, full colour on light. Files in `app/public/brand/`. Use only via the `Logo` component.
- **Never alter the logo.** The full-colour file is a byte-for-byte copy of the owner's original (`docs/reference/meristem look and feel/meristem logo.png`, 2676 x 664). The white version has the same size and artwork; only the dark-green parts turn white and the lime leaf keeps its colour. No recolouring, redrawing, stretching or cropping. (A first white version wrongly turned the lime leaf white; the owner caught it on 13 Oct 2026.)
- **Light-only:** the portal has no dark mode, so MeriQuest has none.
- **Style:** clean sans-serif, rounded cards, pill buttons, small uppercase section labels, green icons. The isometric game scenes use the same green palette.
- Use of the logo and palette still needs Corporate Communications approval (§13 item 8).

## 13. Open questions (do not decide; ask)

> **Recommended answers (13 Oct 2026).** The owner asked me to recommend and proceed on items 2, 4, 7, 8, 9 and 10. The recommendations below are used as working defaults and stay admin-editable. The owner may change any of them.
> - **Item 2, other activities allowed outside Work First windows:** the profile, certificates and reports; Meristem Academy lessons and quizzes; the leadership simulator; reading messages and kudos (no live world presence); Aspirations and Career Dream; the Updates feed. **Not allowed outside windows:** work shifts, the Client Desk, mini-games, market simulation and walking the shared world. Learning hours may be assigned by **line managers (for their own team) and L&D admins**, up to the weekly limit, and never inside blackout periods.
> - **Item 4, Yaba reference:** still needed from the owner (photos of the Yaba office). Until supplied, Yaba uses the Ikoyi HQ visual kit with its own signage. Abuja and Port Harcourt are deferred.
> - **Item 7, who sees leadership and succession results:** the person sees everything. A **line manager sees a summary for their direct reports** (strengths, growth areas, readiness band), not raw choices. **HR business partners and the talent committee see readiness bands and successor slates** for critical roles only. Admins configure these rules and nobody else sees individual results.
> - **Item 8, logo and brand:** proceed with the Meristem logo and palette in the build, flagged for Corporate Communications sign-off before any wider rollout.
> - **Item 9, subsidiaries in the first build:** the pilot units: Customer Experience, Wealth Advisory and Investment Advisory.
> - **Item 10, moderation and eNPS:** chat moderators come from L&D with an HR escalation path, responding within one business day. The eNPS pulse is owned by Group HR, anonymous in aggregate.
> - **Item 11, account activation:** **decided (c)**: keep the shared default password and accept the risk, with a short activation window and audit review of first sign-ins. Revisit before the wider rollout.
1. Starting Path names and whether a **leader/executive** path exists.
2. Work First defaults are approved with the "learning outside work hours" change (§2.1). **Still open:** the owner's sentence ended at "others are okay such as…". Which other activities are allowed outside the windows? And who may assign learning hours?
3. ~~Inter-city travel~~ **Resolved:** Lagos only for now (§2.7).
4. Reference material for the **Yaba** office (Abuja and Port Harcourt deferred). **What each Ikoyi HQ level (Ground, Mezzanine, Floors 1 to 6) is used for**, with photos if possible.
5. ~~Regulator list~~ **Resolved:** all regulators, validated by Group Compliance (§2.9).
6. ~~LMS and e-library~~ **Resolved for now:** own content; the owner supplies access later (§2.10).
7. Who may **see** a person's leadership and succession results beyond the person themselves (manager, HRBP, talent committee) and what is shared. (Who *takes* it is settled in §2.10.)
8. Approval to use the **Meristem logo** and brand palette (Corporate Communications).
9. Which subsidiaries are in the first build (pilot is Customer Experience, Wealth Advisory, Investment Advisory).
10. Who moderates chat and the eNPS owner.
11. **Account activation (security).** The shared default password lets anyone who knows it, and a colleague's staff ID, claim that colleague's account before they sign in (QA-LOG, Findings). Choose: (a) a one-time activation code per person from L&D, (b) an emailed code at first sign-in, or (c) keep the shared default and accept the risk with a short activation window.
