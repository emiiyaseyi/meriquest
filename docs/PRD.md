# MeriQuest: Product Requirements Document (PRD)

**Product:** MeriQuest, a life-simulation learning game for Meristem Securities Limited and its subsidiaries
**Owner:** Learning & Development (L&D), Group Human Resources
**Status:** Draft v0.1, for stakeholder review
**Date:** 12 October 2026
**Companion docs:** [WORKPLAN.md](WORKPLAN.md) · [CAREER-TRACKS.md](CAREER-TRACKS.md) · [LAGOS-LIFE-REVIEW.md](LAGOS-LIFE-REVIEW.md) · [CLIENT-SIMULATION.md](CLIENT-SIMULATION.md)
**Pilot scope (confirmed 12 Oct 2026):** Customer Experience · Wealth Advisory · Investment Advisory · prototype in [`/game`](../game/index.html)

---

## 1. Summary

MeriQuest is a browser- and mobile-friendly game. Each staff member plays a version of their own Meristem career. They walk a map of the Group (HQ, the Wealth Lounge, the Trading Floor, the Registrar Desk, the Deal Room, the Credit Desk, the Trustees Suite, the Family Office, Compliance), meet clients and colleagues, and make realistic decisions. Every decision builds **technical skills** (markets, regulation, analysis, portfolio and risk, systems) and **soft skills** (client communication, ethics, collaboration, ownership, leadership) at the same time. This mirrors how the real job works.

The engagement mechanics are borrowed from consumer life-sim games such as Lagos Life: daily missions, streaks, energy, levels and local flavour. They are tied to Meristem's competency framework, the CEPOEM values, and a manager/L&D reporting layer, so the learning is measurable.

## 2. Problem and opportunity

| Today | With MeriQuest |
|---|---|
| Classroom and e-learning modules are completed for compliance, then forgotten. | Short daily sessions (5–10 minutes) with spaced repetition and immediate consequences. |
| Technical and soft skills are trained separately. | Every scenario blends both, as real client and team situations do. |
| Hard to show managers *how* someone decides, only whether they finished a course. | A decision log, competency deltas and a readiness score for each role transition. |
| One-size-fits-all induction across 7 subsidiaries. | Role- and level-specific tracks (intern → MSP → new hire → team lead → executive). |
| Succession planning is a spreadsheet exercise. | Leadership tracks rehearse 9-box, stay conversations and delegation, and readiness feeds talent reviews. |

Meristem already won the **2023 Best Practices Award for the Delivery of Learning & Development Practices** (per the careers site). MeriQuest builds on that reputation.

## 3. Goals and non-goals

**Goals**
1. Speed up time-to-competence for interns, MSP Starlets and new hires.
2. Build leadership and succession depth among experienced staff (8+ years / team leads).
3. Reinforce conduct, compliance and CEPOEM values through practice, not just policy reading.
4. Give line managers and HRBPs objective skills data for Individual Development Plans (IDPs), confirmations and talent reviews.
5. Cover all 7 subsidiaries and the three MSP pathways (Advisory, Control & Governance, Technical) within 12 months.

**Non-goals (v1)**
- Replacing regulatory certifications (e.g. CIS / SEC sponsored-individual exams). MeriQuest prepares people for them; it doesn't certify.
- Live trading or real client data. All scenarios are fictional.
- Public or consumer release. MeriQuest is internal only (a separate client-education spin-off could connect with the MORE platform later).
- Final performance ratings. Game data informs development conversations; it doesn't decide pay or ratings.

## 4. Users and personas

| Persona | Example | Needs from MeriQuest |
|---|---|---|
| **Intern / SIWES student** | *Ife, 22, Wealth Advisory Intern* | Learn products, KYC and client etiquette safely; know when to escalate. |
| **MSP Starlet (graduate hire)** | *Daniel, 25, Investment Advisory Officer* | Pass the first-quarter assessment; research, suitability, market-abuse rules; take feedback well. |
| **Experienced new hire** | *Amaka, 34, joins Meristem Finance from a bank* | Learn the Group map, Meristem policies, systems and culture fast. |
| **Team lead (8+ yrs)** | *Mr Bayo, 38, Team Lead, Investment Advisory* | Coaching, delegation, succession, retention, crisis leadership, supervisory accountability. |
| **Senior manager / executive** | *Head of Unit / MD of a subsidiary* | Leading leaders, strategy, enterprise risk, culture. *(Phase 3)* |
| **Line manager** | Any people manager | See team progress, competency gaps and conversation prompts. |
| **L&D admin / HRBP** | Group L&D team | Author content, assign tracks, run cohorts, export reports. |
| **Compliance reviewer** | Group Compliance | Approve every scenario that touches regulation or conduct. |

## 5. Name and brand

**Recommended working title: MeriQuest.** It's short, ties to the Meristem name and signals progression.

| Option | Rationale |
|---|---|
| **MeriQuest** ✅ | Clear, memorable, works as an app name and a verb ("done your MeriQuest today?"). |
| **Emerge** | Echoes the MSP call to action, "Are you ready to Emerge?" Strong for the graduate track. |
| **Meristar Life** | Plays on the *Meristar-delight* value and on Lagos Life. |
| **The Growth Ring** | A meristem is the plant tissue where growth happens. Elegant, but less punchy. |
| **Root & Rise** | Suits a leadership and succession edition. |

**Level names (the growth metaphor):** Seed → Sprout → Stem → Branch → Canopy.
**Track names (samples):** *Seedling* (interns), *Starlet Sprint* (MSP first 90 days), *Welcome Aboard* (Group induction), *Canopy* (leading advisors), *Legacy* (succession and bench strength), *Deal Room* (Capital), *Floor Ready* (dealers), *Guardian* (Control & Governance), *Steward* (Trustees and Family Office), *Boardroom* (executive).

> Brand note: the prototype uses a neutral green palette and no Meristem logo. Corporate Communications should approve the use of Meristem marks before rollout.

## 6. Experience design

### 6.1 Core loop (one 5–10 minute session)
1. **Check in.** Today's missions appear (e.g. *handle 2 scenarios · score 2/3 on the knowledge check · take one recharge break*).
2. **Walk the map.** Locations marked **!** have a scenario waiting.
3. **Decide.** A short situation with an NPC (client, colleague, manager) and 3 choices, rated *best / partly right / risky*.
4. **See consequences.** Changes to competencies, Client Trust, Compliance Standing and Energy, plus a **coach's note** explaining the reasoning and the stronger option.
5. **Earn.** XP, CEPOEM value badges, mission bonus, streak.
6. **End the day.** Summary, streak update, energy reset.

### 6.2 Systems

| System | Purpose | Prototype status |
|---|---|---|
| **Time slots** (Morning / Midday / Afternoon / Evening) | Forces prioritisation; keeps sessions short. | ✅ |
| **Energy** | Models wellbeing: you can't keep taking scenarios without recharging. | ✅ |
| **Client Trust** | Lagging indicator of client-centric choices (Clientocracy). | ✅ |
| **Compliance Standing** | Conduct risk. Severe breaches end a track early in production. | ✅ (no fail state yet) |
| **10 competencies** (5 technical + 5 soft) | Skills profile, radar chart, deltas from baseline. | ✅ |
| **CEPOEM badges** | Earned by making the *best* call aligned to a value. | ✅ |
| **Levels and XP** | Seed → Canopy. | ✅ |
| **Daily missions and streaks** | Habit formation. | ✅ |
| **Readiness review** | Track-end "promotion panel" with a score and verdict (*Ready now / with development / not yet*). | ✅ |
| **Journal** | Every decision and coach's note, for reflection. | ✅ |
| **L&D report and xAPI export** | Manager view and data portability. | ✅ (local only) |
| **Branching consequences** | Later scenarios change based on earlier choices (e.g. a client you mishandled returns). | Phase 2 |
| **Multiplayer world** | Colleagues' avatars on a shared 2D map in real time; profiles; moderated team/cohort/location chat and DMs; kudos. See [LAGOS-LIFE-REVIEW.md §7.1](LAGOS-LIFE-REVIEW.md). | MVP |
| **Co-op and mentoring** | 2–4 players take roles in one scenario; senior staff host coaching sessions for juniors. | v1.1 |
| **Team/cohort play** | Cohort leaderboards (team-based, not individual shaming), group challenges. | v1.1 |
| **Work mini-games** | Six hands-on task types modelled on Lagos Life (sort-swipe, sequence, tap-targets, hold-release, keep-in-zone, timing bar), e.g. KYC sorting, T-bill pricing, phishing spotting. | MVP: 3 types; v1.1: all 6 |
| **Client personality sims** | Signature clients (deep conversations with a personality-reading step) and the **Client Desk**: shifts of 6–14 *generated* clients across 7 channels, 4 personalities, 4 moods, 4 tiers and 39 locations (Nigeria, diaspora, international), complexity 1–5. See [CLIENT-SIMULATION.md](CLIENT-SIMULATION.md). | MVP (pilot core) |
| **Office segments & Performance Index** | Front (70% sales/client), Middle (50/50), Back (70% support / 30% growth) weightings; conduct gate. | MVP |
| **Micro-courses** | 5 lessons × (notes + 3 questions), max 2 lessons a day; a certificate improves odds in related scenarios. | MVP |
| **Seasonal events** | Market-shock weeks, MPC decision days, AGM season, year-end. | Phase 2 |
| **AI role-play** | Free-text conversations with an AI client or colleague, graded against a rubric. | Phase 3 (pilot) |
| **Group economy** | Cross-subsidiary referrals earn "Group synergy" points. | Phase 3 |

### 6.3 Content model
Each **track** has: target role and transition (e.g. *Intern → Wealth Advisory Officer*), audience, the skills needed (technical and soft), 6–12 **scenarios**, a **quiz bank**, and the **focus competencies** used for readiness.
Each **scenario** has: location, NPC, situation text, type (*Technical / Soft skill / Blended*), 3–4 choices (rating, effects, CEPOEM value, outcome text), a coach's note, and references (policy, regulation, model).
See `game/content.js` for the exact schema used by the prototype.

## 7. Track catalogue (summary)
The full role-by-role skills matrix is in [CAREER-TRACKS.md](CAREER-TRACKS.md).

| Wave | Track | Audience | Status |
|---|---|---|---|
| 1 | 🌱 Seedling: Wealth Advisory Internship | Interns / SIWES | **Playable in prototype** |
| 1 | ⭐ Starlet Sprint: First 90 Days | MSP Advisory pathway | **Playable in prototype** |
| 1 | 🧭 Welcome Aboard: Group Induction | All new hires | **Playable in prototype** |
| 1 | 🌳 Canopy: Leading Advisors | Team leads, 8+ yrs | **Playable in prototype** |
| 2 | 🛡️ Guardian: Control & Governance | MSP: Compliance, ICU, Audit, Risk, Strategy | Planned |
| 2 | 🔬 Analyst Edge | MSP Technical: Research, IB Analyst, Fixed Income & PM | Planned |
| 2 | 📈 Floor Ready | Dealers, Meristem Stockbrokers | Planned |
| 2 | 🤝 Client Advisory Officer | MSP Advisory: Client Advisory | Planned |
| 3 | 🗂️ Registrar & Probate Officer | Meristem Registrar | Planned |
| 3 | 📜 Steward: Trust & Estate | Meristem Trustees / Family Office | Planned |
| 3 | 🏗️ Deal Room | Meristem Capital | Planned |
| 3 | 🏦 Credit & Lending | Meristem Finance | Planned |
| 3 | 🌳 Legacy: Succession & Bench Strength | All people managers | Planned |
| 4 | 👑 Boardroom: Leading Leaders | Senior managers → MDs | Planned |
| 4 | ⚙️ Enablers | HR, IT, Finance & Admin, Operations | Planned |

## 8. Functional requirements

### 8.1 Player
| ID | Requirement | Priority |
|---|---|---|
| P-1 | Sign in with **staff ID or work email + password** (no Microsoft/SSO login; decided 12 Oct 2026). New and reset accounts use a default password and must set their own at first sign-in; lockout after repeated failures; generic error messages; session expiry; sign out on all devices. *(Prototype implements this flow in the browser; production checks it on the server.)* | Must |
| P-2 | Tracks auto-assigned from HRIS (grade, unit, tenure), plus optional self-enrol tracks. | Must |
| P-3 | Play the core loop on mobile and desktop browsers; installable as a PWA. | Must |
| P-4 | Resume progress across devices (server-side save). | Must |
| P-5 | Skills profile, journal, values and readiness review visible to the player. | Must |
| P-6 | Accessibility: keyboard play, screen-reader labels, WCAG 2.2 AA contrast, reduced-motion support. | Must |
| P-7 | Low-bandwidth mode (no heavy assets; under 300 KB first load). | Should |
| P-7a | Client Desk shifts with generated clients; per-shift scorecard (FCR, CSAT, response targets, AHT, tone fit, conduct, value, growth). | Must |
| P-7b | Office segment chosen at onboarding (from HRIS in production) drives the Performance Index weighting. | Must |
| P-8 | Shared 2D world: see colleagues' avatars and presence in real time; visit locations together. | Must |
| P-8a | Chat: team, cohort and location channels plus 1:1 DMs, under real-name staff accounts (from the staff directory); report and block; profanity/PII filter. | Must |
| P-8b | Kudos (limited per week), colleague relationship ladder, co-op scenarios, mentoring sessions. | Should |
| P-8c | Cohort / team challenges and leaderboards. | Should |
| P-8d | "Invisible" mode and notification controls. | Must |
| P-9 | Reminders via Microsoft Teams or email (opt-in). | Could |

### 8.2 Line manager
| ID | Requirement | Priority |
|---|---|---|
| M-1 | Team dashboard: progress, competency heatmap, readiness, risky-choice patterns. | Must |
| M-2 | Conversation prompts generated from the data (e.g. *"Ask Femi about concentration risk"*). | Should |
| M-3 | Export a player's report to their IDP. | Should |

### 8.3 L&D admin
| ID | Requirement | Priority |
|---|---|---|
| A-1 | Content authoring UI (tracks, scenarios, quizzes) with preview. | Must |
| A-2 | Review workflow: draft → SME review → Compliance approval → published, with version history. | Must |
| A-3 | Cohort management: assign tracks and deadlines to groups. | Must |
| A-4 | Analytics: completion, time-on-task, item difficulty, choice distributions, pre/post deltas. | Must |
| A-5 | Send xAPI statements to an LRS / the existing LMS; SCORM wrapper if the LMS requires it. | Should |
| A-6 | Bulk import and export of content (JSON/CSV). | Should |
| A-6a | Case-library authoring: add a case template once; the generator varies personality, mood, tier, channel and location automatically. Compliance approval per case. | Must |
| A-6b | Calibrate shifts from aggregated contact-centre data (channel mix, contact reasons, response and handling-time targets). | Should |
| A-6c | Staff & access admin: search staff, reset password to the default (forces a change at next sign-in), unlock, disable/enable, change role (staff / manager / admin), add staff, CSV import/export, audit log of admin and security events. *(Prototype implemented.)* | Must |
| A-7 | Moderation console: reported messages, user restrictions, keyword lists, chat-retention settings, audit trail. | Must |

## 9. Non-functional requirements
- **Security:** staff ID/email + password sign-in checked on the server; passwords hashed with Argon2id or bcrypt; the default password kept only as a server-side secret (environment variable or admin setting), never in front-end code, and forced to change at first sign-in; rate limiting and lockout; secure, HTTP-only session cookies with expiry; role-based access (player / manager / admin / reviewer); audit log of admin and security events; HTTPS only; OWASP ASVS L2; penetration test before go-live. Optional later: two-step verification by email code for admins.
- **Privacy:** Compliance with NDPA 2023. A Data Protection Impact Assessment (DPIA) before the pilot. Data minimisation (no client data at all). Retention policy (e.g. 3 years). Clear notice to staff about what's collected and who sees it.
- **Hosting:** Meristem-approved cloud tenant, with data residency confirmed by IT/Risk.
- **Performance:** p95 page interaction under 200 ms; first load under 3 s on 4G.
- **Availability:** 99.5% during business hours; content cached for offline replay.
- **Supportability:** Content changes need no code deploy.

## 10. Recommended technical architecture

| Layer | Recommendation | Why |
|---|---|---|
| Front end | **Next.js (React + TypeScript)**, PWA | The same stack Lagos Life uses; mature; SSR plus offline. |
| Game state | Client-side engine (port of `engine.js`) + server reconciliation | Instant feedback, server stays the source of truth (server-authoritative scoring prevents Lagos Life-style exploits). |
| 2D world rendering | **PixiJS** (WebGL 2D) or Phaser, with illustrated tile/scene art | Smooth on low-end phones; a lighter fallback view like Lagos Life's |
| Real-time multiplayer | **WebSockets**: Azure Web PubSub, Supabase Realtime or Socket.IO on Node | Presence, chat, co-op scenarios; scales to Group headcount easily |
| Back end / API | Next.js API routes or NestJS | One TypeScript codebase. |
| Database | **PostgreSQL** (Azure Database for PostgreSQL or Supabase) via Prisma | Relational data (users, tracks, attempts) with JSON for content. |
| Auth | **Staff ID / work email + password**, server-side (Auth.js credentials or Supabase Auth), hashed passwords, default password + forced change, admin reset | Decided 12 Oct 2026: no Microsoft login. Staff directory imported from HR (CSV) and managed in the admin panel. |
| Content | Content stored in Postgres with an admin UI (v1); a headless CMS later if needed | Keeps v1 simple. |
| Learning records | xAPI → Learning Record Store (e.g. built-in table → external LRS) | Portability to the LMS. |
| Analytics | Postgres views + Power BI / Metabase dashboards | HR already reports in BI tools (to confirm). |
| Hosting / CI | **Netlify** (preferred) or Vercel, deploying from GitHub; Supabase for Postgres, Realtime and Storage | Simple, auditable deploys; preview link for every change. |
| AI role-play (Phase 3) | Claude API with rubric-based grading; no client data in prompts | Practice open-ended conversations. |

### 10.1 Core data model (v1)
`User(id, staffId, name, email, unit, subsidiary, grade, managerId, role)` ·
`Track(id, slug, title, audience, targetRole, focusCompetencies[], version, status)` ·
`Scenario(id, trackId, order, location, type, payload JSON, version, status, approvedBy)` ·
`QuizItem(id, trackId|null, competency, payload JSON)` ·
`Enrolment(userId, trackId, cohortId, assignedAt, dueAt, status)` ·
`Attempt(id, userId, scenarioId|quizItemId, choice, rating, deltas JSON, at)` ·
`PlayerState(userId, trackId, day, slot, energy, trust, compliance, xp, comps JSON)` ·
`Badge(userId, valueId, count)` · `Statement(xAPI JSON)` · `Cohort(id, name, ownerId)`

## 11. Success metrics

| Metric | Target (pilot) |
|---|---|
| Weekly active players (as a share of those enrolled) | ≥ 70% |
| Median sessions per week | ≥ 3 |
| Track completion | ≥ 80% within the assigned window |
| Pre/post knowledge gain (same items) | +25 percentage points |
| Share of "best" decisions, first attempt vs. replay | +20 pp |
| Manager-rated on-the-job behaviour change at 60 days | ≥ 60% "noticeable" |
| Learner satisfaction (NPS-style) | ≥ +40 |
| Business proxies (by track) | Fewer KYC exceptions, faster MSP confirmation, retention of top talent, successor coverage of critical roles |

## 12. Content governance
1. **Author** (instructional designer) drafts from a template.
2. **SME** from the relevant subsidiary validates accuracy (products, processes, numbers).
3. **Compliance** approves anything touching regulation, conduct or client communication.
4. **L&D lead** publishes. Every scenario carries a version and a review date (at least every 12 months, or immediately after a regulatory change).

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Gamification feels childish to senior staff | Professional visual tone; leadership tracks focus on dilemmas, not points; leaderboards are optional and team-based. |
| Players optimise for XP, not learning | XP is weighted to *best* decisions; options are shuffled; the coach's note is always shown; replays are allowed but the first attempt is what's reported. |
| Content inaccuracy / regulatory drift | SME + Compliance sign-off, review dates, a "report an issue" button. |
| Data used punitively | **Decided: development use only.** Managers see trends and readiness, not every click. Communicated upfront in the employee notice. |
| Chat misconduct (harassment, leaks of client data) | Real-name identities, a filter, report/block, trained moderators, an acceptable-use policy linked to the Code of Conduct, no client data in chat (automatic PII detection) |
| Multiplayer adds build complexity | Phase it: presence + chat in the MVP; co-op scenarios in v1.1; load test before the pilot |
| Low adoption after launch | Executive sponsor, cohort launches, Teams nudges, a monthly content drop tied to real market events. |
| Build cost overrun | Start from the working prototype; content-first; phase the features. |

## 14. Open questions
1. Which LMS (if any) must MeriQuest report to, and does it accept xAPI or only SCORM?
2. ~~Is staff identity on Microsoft 365 / Entra ID?~~ **Decided 12 Oct 2026: no Microsoft login; staff ID/email + password.** Which hosting region should staff data use (NDPA)?
3. Which HRIS holds grade, unit and manager data, and is there an API or a CSV export?
4. Who is the executive sponsor, and who are the SMEs per subsidiary?
5. ~~Can game outcomes inform MSP first-quarter assessments?~~ **Decided 12 Oct 2026: development only.**
6. Can the Meristem brand (logo, colours) be used inside the game?
7. Budget envelope and target pilot date.
8. Who moderates chat (HR/L&D), with what response times, and how long are chat records kept?

**Decisions made 12 Oct 2026:** full multiplayer world · session-based days · 2D illustrated map · development-only data use. Rationale and safeguards are in [LAGOS-LIFE-REVIEW.md](LAGOS-LIFE-REVIEW.md) §7.

---
*Appendix: the prototype in `/game` implements the core loop, 4 tracks, 24 scenarios, 19 quiz items, a skills radar, CEPOEM badges, a readiness review and an xAPI-style export.*
