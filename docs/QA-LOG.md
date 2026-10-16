# MeriQuest QA and security log

Every change passes the gate in [RULEBOOK §5.1](RULEBOOK.md) before it is committed. Each run is recorded here, with evidence, accepted risks and open items.

---

## V2: Clients remember the person; waiting clients stand in the lobby (16 Oct 2026)
Scope: second half of the visitors work. (1) **Account-officer relationships:** each person has a client book (their regulars). What a client remembers is kept per client: a good visit warms them, a poor visit or a breach cools them, and **giving up waiting** counts against the person. It changes the next conversation: a client who trusts the person starts up to 10 points ahead and one who does not starts up to 10 behind, and the person reads a line before the visit ("Seen 2 times. Last visit: ★★★★★. They trust you.") and after it. A decision today is felt on a later day. (2) **Waiting clients stand in the lobby** in front of reception (up to four, each with a stable look and a name tag), and clicking one opens Reception. 8 new tests (661 total). **Checked in a real browser**: a waiting client stands in the lobby and the waiting count pulses at the top.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass** | `npm run qa` exit 0: 661 of 661 tests, no lint warnings, build, audit |
| 2 | Fairness | **Pass** | the head start is capped at 10 points either way, and the score is still decided mostly by the quality of the decisions; nothing changes while the person is away |
| 3 | Authz, validation, security | **Pass** | the book is read and written only for the signed-in person; visitors in the lobby are drawn from that person's own list; no new routes |

---

## V1: Visitors through the day: clients and colleagues arrive (16 Oct 2026)
Scope: owner request to weave scenarios into the game: clients come to the office (some with an appointment to see their account officer, some walking in), most people attend to more than 10 a day, and colleagues also bring requests. **Pacing:** each person's day list is made from their unit's number of clients (10 for Customer Experience, 15 for advisors, from the Client Desk settings) plus a few colleagues' requests; visitors **arrive while the person is in the game**, about one a minute or two, and are counted by time in the game, **never by the clock**, so nothing piles up or goes wrong while someone is away (RULEBOOK §2.1: nothing may pressure people to play). A visitor left waiting too long **while the person is playing** gives up and leaves, and a follow-up reaches Updates later. **Appointments** are clients from the person's steady **client book** (the same regulars each day); the rest are walk-ins. **Colleagues** bring requests that are marked "internal" (the situations that start "all-"), answered at reception for a few Merit points, with the same consequences, follow-ups and chains as shifts. **In the game:** a pulsing "waiting" count at the top, a Reception sheet (Clients and Colleagues), and a mission for helping a colleague. The Client Desk now lists only clients who have arrived. All of it is editable under Settings > Visitors through the day (pace, appointment share, patience, how many wait at once, book size, colleagues' names and departments); switching pacing off brings the whole day at once. 18 new tests (653 total). **Checked in a real browser**: after about two minutes of play two clients were waiting, the chip pulsed and Reception opened.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass** | `npm run qa` exit 0: 653 of 653 tests, no lint warnings, build, audit |
| 2 | Fairness and no pressure | **Pass** | tested: nothing counts while the person is away (3 hours away changes nothing); visitors leave only after waiting in game time; nothing is lost in points |
| 3 | Input validation, authz, economy tampering | **Pass** | visitor ids and choices are checked against the person's own list; a made-up or already-seen visitor is refused; colleague pay comes from settings; `/api/me/arrivals` answers only for the signed-in person |
| 4 | Secrets, security review | **Pass** | no new secrets; colleague situations are sent without their verdicts |

---

## S3: Consequences for client conversations (16 Oct 2026)
Scope: the Client Desk now shows what happens next after every client, in real life. One written story per **outcome** (invests, wants time, declines, stays, leaves) and one per **kind of breach** (unsuitable product, documents not checked, promising returns, an improper favour, an off-schedule discount, opening before documents, a guessed or rigged risk profile, bypassing the checker, bluffing): a timeline (today, this week, this month) and who is affected. The most serious ones also send a **follow-up to Updates later** (a complaint arrives, Compliance asks to review a recommendation). The stories are general descriptions of how things typically unfold, not specific rules or penalties, and are drafts for Group Compliance to check (RULEBOOK §2.9). Editable under Settings > Client Desk. 2 new tests (637 total): every outcome and every breach kind has a story, and the result carries them.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass** | `npm run qa` exit 0: 637 of 637 tests, lint, build, audit |
| 2 | Input validation, authz, security review | **Pass** | new settings validated by the schema; nothing new on the wire from the browser |

---

## S2: Consequences engine for scenarios (16 Oct 2026)
Scope: owner request to make the scenarios show **the consequences of a choice as in real life**, in Customer Experience, Wealth Advisory, Investment Advisory and Leadership. This is the engine; the content follows in batches. Every choice in a shift situation, client-simulation case and leadership scenario can now carry: (1) a **consequence**: a headline, a timeline (Today / This week / This month) and who is affected (Client, Firm, You, Team), shown after the choice; (2) a **follow-up** that arrives in **Updates later** (real minutes standing in for days), held in the person's notice box and moved in when due; (3) a **next situation**, so a choice can lead to a chained one (at most 3 per shift or run, never added too late to answer, chain-only situations are never dealt at random). Settings gained `consequence`, `followUp`, `next`, `chainOnly` and `reviewed` (new situations start as drafts for Compliance review); the form editor shows them. New shared panel for the results in the shift card and the leadership and client simulation screens. 9 new tests (635 total).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass** | `npm run qa` exit 0: 635 of 635 tests, lint, build, audit |
| 2 | Input validation | **Pass** | all new fields bounded by the schema (lengths, counts, a chain must point at an existing other situation, at least one situation must be dealt at random); text is rendered as text, never as HTML |
| 3 | Economy and fairness | **Pass** | a chain cannot run away (3 maximum) and cannot add a situation with no time left to answer it; follow-ups have no points effect |
| 4 | Authz, secrets, security review | **Pass** | no new routes; all state stays in the person's own record and notice box |

---

## U5: Lift took people to their desk; location bar spacing; test limits (15 Oct 2026)
Scope: three owner reports. (1) **The lift to Floor 1 showed the person's own desk instead of the floor.** Cause: Floor 1 holds two rooms (the personal Workspace, listed first, and the open-plan floor) and the lift went to the first room of the level. A new rule (`liftRooms`, `isPersonalRoom`) keeps personal rooms out of the lift list, so Floor 1 offers the open-plan floor; and when someone is in their Workspace the lift no longer says "You are here" for Floor 1. 2 new tests. (2) **The needs panel and the location bar were too close.** Measured in a real browser at seven widths (900 to 1920 px): the needs panel is a fixed 12 to 434 px, but the bar was centred on the screen, so it came within 14 px or overlapped on mid-width screens. The bar now starts 32 px to the right of the needs panel and stops 190 px short of the right edge (clear of the Go to work button) at 900 px and wider, so there is always a clear gap on both sides. (3) **Test limits.** The full suite timed out again on a busy machine (a database start-up hook at 10 s, then a whole-app test at 5 s): the project now allows 30 s per test and 60 s per start-up hook (`vitest.config.mts`), and the database suite's own start-up hook also gets 60 s. Before this the log recorded two runs that stopped on that timeout.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass** | `npm run qa` exit 0: 626 of 626 tests, lint, build, audit (two earlier attempts failed on the timeouts above and were not committed) |
| 2 | Authz | **Pass** | the server still checks the chosen level and room; this only changes what the lift offers |
| 3 | Security | **Pass** | no new routes or secrets |

---

## U4: Wall signs (15 Oct 2026)
Scope: owner's comparison with the reference (signs such as COFFEE on the walls). Rooms can now have **signboards** on the two back walls: dark boards with bold white capitals that follow the slant of the wall (on the left wall the text runs away from the corner so it reads left to right), set high above doors and screens. They are **admin-editable per room** under Settings > Room activities (words, which wall, how far along, how wide); the room's own wall features are never changed. Default signs: Ikoyi HQ (lobby), Reading corner and Open-plan floor (floor), Boardroom, Executive lounge, Yaba office. A sign that would run off its wall is ignored. 3 new tests (624 total). **Checked in a real browser** in the boardroom and the open-plan floor. Not done: signs for the Coffee point, water cooler and pantry, because those spots stand away from the back walls; they need the spots moved to a wall, or free-standing signs (owner to decide).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass** | `npm run qa` exit 0: 624 of 624 tests, lint, build, audit |
| 2 | Input validation | **Pass** | sign words 1 to 24 characters, wall x or y, position and width bounded by the schema; drawn as canvas text, never as HTML |
| 3 | Secrets, security review | **Pass** | no new routes or secrets |

---

## U3: Shift card like the reference, with work styles (15 Oct 2026)
Scope: owner's comparison with the reference. The shift card moved to the **top left** (the venue card hides during a shift) and now shows: Merit points so far, a **performance ring** (best answers count fully, partly half), "answered / total and the bonus when all are handled", a story line (the situation now, or when the next comes), a coloured bar of the situations, and the **five work styles** (RULEBOOK §2.6 step 4). Styles are admin-editable (Settings > Work shifts): each sets **pay as a percentage** and **what it does to the needs** when the shift is finished (for example Push hard pays 120% and tires you; Take it easy pays 75% and lifts mood). A style never changes whether a decision counts as good or the skill points, so development scores stay about decision quality. It can be picked at the start or changed until the first situation is answered, then it is locked (server-enforced); leaving early applies nothing. New action `setShiftStyleAction`. 6 new tests (621 total). **Checked in a real browser**: card layout, points so far after an answer, locked styles; also fixed the needs panel jumping to the top when the venue card hides.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass** | `npm run qa` exit 0: 621 of 621 tests, lint, build, audit |
| 2 | Input validation, authz, economy tampering | **Pass** | the style id is checked against the settings; the change is refused after the first answer; pay and needs effects come from the server's settings, never from the browser |
| 3 | Secrets, security review | **Pass** | no new secrets or routes |

---

## U2: Reference-style HUD: online count, camera presets, inbox, clean screen, keyboard (15 Oct 2026)
Scope: owner's comparison with the Lagos Life reference screen. (1) **Online count** in the top bar: colleagues the game has heard from in the last two minutes (a real count from the existing heartbeats, kept for 15 seconds so it adds no load); the person looking always counts, so it never shows 0. (2) **Camera presets** card on the right: **My desk** (zooms in on where you stand), **Floor** (the whole room) and **Overview** (top-down); they reset when you change room, and "My desk" lets the player's own position decide the focus. (3) **Inbox button** (bell with unread badge) opens the phone on Updates. (4) **Clean screen** is now a labelled pill at the bottom right, next to a **keyboard shortcuts** button (on narrow screens the old picture button stays). Not built on purpose: a **sound toggle**, because the game has no audio yet (a switch with nothing to mute would be misleading); no money "+" (no real money, RULEBOOK §3). 6 new tests (615 total). **Checked in a real browser**: all pieces appear, My desk zooms, Overview is top-down, Clean screen hides the panels, the shortcuts open.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass** | `npm run qa` exit 0: 615 of 615 tests, lint, build, audit |
| 2 | Privacy | **Pass** | the online figure is a single number; no names or other people's data |
| 3 | Authz | **Pass** | the count is part of the signed-in person's own game state |

---

## U1: Location bar no longer covers the needs panel (15 Oct 2026)
Scope: while comparing our game screen with the Lagos Life reference (owner request), a layout bug showed at 1366 pixels wide: the location bar (centre, bottom) overlapped the right end of the needs panel (bottom left) by about 37 pixels, hiding part of two needs. On screens 1000 pixels and wider the bar is now narrower (460 to 640 pixels) so it stays clear. CSS only. **Checked in a real browser** before and after.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Pass (on re-run)** | The first `npm run qa` stopped on the known flaky database test (a 10-second start-up timeout under load) and the commit was made before the gate was re-run: that was a mistake in the process. The full gate was then re-run and was clean: 609 of 609 tests, lint, build and audit |
| 2 | Security | **Pass** | style change only |

---

## T2: Scannable QR code and an account page (15 Oct 2026)
Scope: owner feedback on T1. (1) The QR code did not scan on the owner's phone. Cause found by testing: the old code (49 squares across, 4.6 pixels each, a two-square blank border, rounded corners close to the corner marks) decoded in software but is hard for a phone camera. The setup link is now shorter (the default algorithm, digits and period are dropped; the app reads defaults), so the code is 41 squares across, drawn 288 pixels wide with a **four-square blank border** inside a white frame, **centred** on the page. Checked by rendering it in a real browser at three screen sharpnesses and decoding it with a QR reader library: decodes every time and returns the exact link. The typed setup key remains as the fallback. (2) **/account** gave "page not found": it is now an account page with links to two-step sign-in (showing on or set up) and change password. 1 new test (609 total).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean; `/account` listed in the build |
| 2 | Tests | **Pass** | 609 of 609 |
| 3 | Authz | **Pass** | `/account` needs a signed-in user (same check as the security page) |
| 4 | Secrets | **Pass** | the QR still carries the person's own setup secret to the person only |

Not tested on a real phone camera (none available here); the typed key is the fallback. The dev database was not reachable from this machine at the time (a DNS refusal), so the full-page test was replaced by an exact render of the same code and frame.

---

## T1: Two-step setup: QR code and visible links (14-15 Oct 2026)
Scope: first use on the Vercel test site. (1) The setup page offered only an `otpauth://` link, which a desktop browser cannot open; it now shows a **QR code** (drawn on the server by the `qrcode` package and passed as an SVG picture, so no outside service sees the secret) above the typed **setup key** for people who cannot scan. (2) The two-step page was only linked from the old dashboard page; it is now in the **admin menu** and in the game's **Me panel > Account**. (3) Correction to earlier guidance: "Admin areas need it" is only true when Settings > Sign-in rules > require two-step for admin areas is on; it is **off by default**. New dependency: `qrcode` (and its types). **Checked in a real browser** with a throwaway user: the QR image loads at 224 by 224 and the key is shown. 0 new tests (browser check; the setup logic is covered by the existing two-step tests).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean (one img warning silenced on purpose: a data picture made on the server) |
| 2 | Tests | **Pass** | 608 of 608 |
| 3 | Secrets, crypto | **Pass** | the secret is only drawn into a picture sent to the person who asked, the same data the page already showed; nothing leaves the server for a third party |
| 4 | `npm audit` | **Pass** | clean in `npm run qa` |

---

## D2: Supabase certificate option and database walk-through (14 Oct 2026)
Scope: the owner created a Supabase project for the test deployment. Supabase signs database certificates with its own authority, which Node does not trust by default; the app verifies TLS strictly and refuses to skip it in production, so the connection would fail. Added an optional `DATABASE_CA_CERT` setting (the authority's certificate, PEM): the connection is **still fully verified**, it just trusts that authority. Accepts a pasted value with literal backslash-n, and refuses text that is not a certificate. The migration script reads it too. `docs/DATABASE-SETUP.md` Part A now walks through Supabase (Frankfurt region, pooler string, certificate download, one-off migration, optional Data API off). 1 new test (608 total).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean (pg suite timed out once under load and passed on the re-run) |
| 2 | Tests | **Pass** | 608 of 608 |
| 3 | Crypto / TLS | **Pass** | `rejectUnauthorized` stays true; `no-verify` and `disable` are still refused in production; the certificate is an extra trusted authority, not a bypass |
| 4 | Secrets | **Pass** | no connection string or password in code or docs; the certificate is public |

---

## W1: Workspace is a desk, and a private office for chosen people (14 Oct 2026)
Scope: owner feedback on Buy mode. (1) The Workspace now shows the person's **desk** (a small pod around a desk surface) instead of the whole open floor. (2) **Desk size grows with role and experience**: admin-set layouts in Settings > Workspace decoration (default: standard desk 5 by 4, senior desk 6 by 4 from 3 years, team lead desk 7 by 5 for line managers). (3) **Private office** (10 by 8, windows, sofa, cabinet) only for chosen people: by job title (default: Chief, COO, CFO, CEO, CTO, Managing Director, Executive Director, Head of Business), or by staff id; "Head of Client Service" does not get one. Layouts are checked in order and the last one is for everyone else (the setting refuses a list whose last entry has a rule). The **server** works out each person's layout from their title, years and line-manager flag and checks every buy, place and move against that layout's area and item limit; the browser only draws it. The needs rules, which do not know the person, accept anything inside the largest layout. The room is also centred in the space above the Buy mode catalogue. Decision recorded in RULEBOOK §12. 5 new tests (607 total). **Checked in a real browser** with a throwaway user: a standard desk, and a "Chief Operating Officer" office.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 607 of 607 |
| 3 | Input validation, authz, economy tampering | **Pass** | placement limits come from the server-side layout, not from the browser; layout list validated by the schema (ids, sizes, staff id pattern, last entry for everyone) |
| 4 | Secrets, audit, security review | **Pass** | no new routes or secrets |

Known effect: if an admin shrinks a layout, things placed outside the new area are dropped the next time the person opens their Workspace (they stay owned). Open: Workspace art for the office is a first version.

---

## D1: Vercel deployment preparation (14 Oct 2026)
Scope: preparing the first (test) deployment to Vercel, which the owner will click through. Added `app/vercel.json` (Next.js, functions in Frankfurt `fra1` to sit next to a Frankfurt database) and a step-by-step "First deployment to Vercel" guide in `docs/DATABASE-SETUP.md`: a new empty database, the one-off migration, the Vercel project settings, the variables and which are secret, first sign-in, and known limits. **Nothing was deployed by me and no secret passed through me.** Production rules checked in `env.ts`: production needs `STORE=postgres`, `DEFAULT_PASSWORD`, a different `BOOTSTRAP_ADMIN_PASSWORD`, no sample staff and no memory store, so a test deployment starts empty and test staff are added in Admin > Staff & access. Finding: Vercel's request limit (about 4.5 MB) is below the app's evidence limit (three 2 MB files), so a concern with more than about two large files would fail there (documented; owner to decide).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint, tests | **Not re-run** | configuration and documentation only; the last full `npm run qa` (C7) was clean on the same code |
| 2 | Secret scan | **Pass** | no secret values in the file or the guide, only variable names |

Open items before real staff data: provider and region approval (IT, Risk, DPO), daily backups, production database, virus scanner and private evidence bucket, and a decision on the evidence size limit.

---

## C7: Real-browser check of the new phone apps, small fixes, client figures in admin Reports (14 Oct 2026)
Scope: first browser run of the new apps with a throwaway user (removed afterwards; the script was stopped from sending kudos to real accounts). **Checked in the browser:** all eight apps open and fill (Directory, Kudos, My Role, Market, My Portfolio, Clients, Compliance Desk, Reports); a practice buy works and shows in My Portfolio; a client is served through its steps and gives a rating, the client's decision and a breach note; pre-clearance is approved; a gift is declared and recorded; the Kudos form picks a colleague and shows the daily allowance; the Clients list shows 10 clients for customer experience. **Fixed after the run:** success messages were shown on the red error background; the "Pre-clear" tab wrapped onto two lines (now "Dealing"); a negative amount showed as "₦-0.87" (now "-₦0.87"). **Added:** admin Reports now shows clients served, average client rating and conversations with a breach (cards, people table and the spreadsheet download). Sending kudos was not clicked in the browser (it would have sent a real notification and points to a real account); it is covered by the service tests.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 602 of 602 |
| 3 | Authz, validation, secrets, audit, security review | **Pass** | the admin Reports page keeps its "reports" area check; no new routes |

---

## C6: Room places: Meet a client, Ask a question (14 Oct 2026)
Scope: last of the "Coming soon" builds. The two spots that said "Coming soon" now work: **Meet a client** opens the Work Phone on the Clients app, and **Ask a question** opens it on the Directory (find a colleague, message them or send kudos). The phone opens on the chosen app and returns to the home screen the next time it is opened normally. UI only: no new route, action or input; both apps keep their own server checks.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 602 of 602 |
| 3 | Authz, validation, secrets, audit, security review | **Pass** | no new attack surface |

Not yet checked in a browser. All "Coming soon" items from the owner's list are now built: Directory, Kudos, My Role, Market, My Portfolio, Clients, Compliance Desk, Reports, and the two room places.

---

## C5: Compliance Desk and Reports app (14 Oct 2026)
Scope: fourth and fifth "Coming soon" builds. **Compliance Desk** (RULEBOOK §2.9): your compliance standing (compliance courses certified, client breaches, turned-down requests, declined offers); **personal-dealing pre-clearance** (the desk answers at once from rules: restricted share, holding period, the largest deal it will approve; an approval lasts a set number of hours and covers one trade); a **gifts and entertainment register** (record and accept up to a limit, wait for approval above it, decline above the upper limit, never accept cash); the restricted list; the regulators. A new setting under Settings > Compliance Desk can **require a pre-clearance before any practice trade** (off by default); the market then refuses a trade without one and uses it up after one trade. **Reports** app: your own progress (level, points, streak, lessons, certificates, shifts, leadership runs, average client rating, kudos, practice portfolio, strongest skills). New routes `/api/me/compliance` and `/api/me/report` (own data only), actions `requestPreclearanceAction` and `declareGiftAction` (re-check the user), audit entries. 10 new tests (602 total).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean after fixing two lint errors (a function named like a hook, and `Date.now()` during render) |
| 2 | Tests | **Pass** | 602 of 602 |
| 3 | Input validation | **Pass** | instrument, side, units, gift kind, value and the "from" text all checked and capped |
| 4 | Authz, economy tampering | **Pass** | signed-in only; own records only; the desk decides from the rules, never from the browser; a pre-clearance is single-use |
| 5 | Secrets, audit, security review | **Pass** | no secrets; requests and declarations audited |

Not yet checked in a browser. Admin Reports does not yet show clients served or average rating (open item).

---

## C4: Client Desk reworked: more clients and different conversations (14 Oct 2026)
Scope: owner feedback on C3. (1) Clients a day are set **by unit** in Settings > Client Desk: customer experience 10, wealth advisory 15, investment advisory 15, any other unit 10. The library grew to 42 clients so every unit can fill a day. (2) Each client has **their own conversation flow**, so no two kinds feel the same: a short chat (3 steps), the standard 4 steps, **onboarding** (documents, risk profile, account opening with the checker's approval), a **presentation** (prepare, then a hard question), **price and trust objections**, **comparison with a competitor**, **several rounds of convincing**, a complaint-only flow for an upset client, and clients who **ask for something improper** (backdating a form, splitting a cash deposit, a share tip before an announcement, a gift for priority). Each client has a **resistance**: some take longer to convince, and "just looking" clients never invest however well they are served, but the rating still reflects service quality. The result now shows what the client decided (invests, wants time, declines, stays, leaves). Breaches are data-driven (promising returns, doing the improper thing, off-schedule discount, opening before documents, rigged risk profile, bypassing the checker, bluffing). Merit points per client were lowered (3 / 2 / 0, plus 2 when the client invests) because a person now serves 10 to 15 a day; all are editable. Server still scores everything; one atomic update per step. 6 new tests (592 total).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 592 of 592 |
| 3 | Input validation, authz, economy tampering | **Pass** | unchanged rules; step and option ids checked against the client's own flow; the schema now also checks every flow step exists and that `{ask}` steps have text |
| 4 | Secrets, audit, security review | **Pass** | no new inputs or routes |

---

## C3: Clients app, the Client Desk (14 Oct 2026)
Scope: third "Coming soon" build. Each day a person is offered a few fictional clients that match their unit and experience (companies need more years at Meristem). They go through four steps (meet, understand, recommend, close). The **server** scores the run from the choices: tags on each choice, the client's behaviour type (many questions, invests large, price-sensitive, anxious, impatient, first-timer, upset, committee-driven), whether the product suits the client, and a small admin-set amount of chance. It records a client rating (1 to 5), an NPS bucket and any compliance breach (unsuitable product, promising returns, skipping needed document checks), pays Merit points once, updates the person's stats and sends a notice. Settings > Client Desk edits clients, types, steps and scoring. Routes: `/api/me/clients` (own data), actions `startClientAction` and `answerClientAction` (re-check the user). Mission "Serve a client". 8 new tests (586 total).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean (after clearing a OneDrive-locked `.next`) |
| 2 | Tests | **Pass** | 586 of 586 |
| 3 | Input validation | **Pass** | client id and option id strictly checked against today's list and the current step; recommend step checked against the market kinds |
| 4 | Authz, economy tampering | **Pass** | signed-in only; own queue only; step order enforced in one atomic update, so a repeated answer or client pays nothing twice; score never taken from the browser |
| 5 | Secrets, audit, security review | **Pass** | no secrets; each served client audited |

Not yet checked in a browser. Fictional clients only (RULEBOOK §3).

---

## C2: Practice market and My Portfolio (14 Oct 2026)
Scope: second "Coming soon" build (work apps: Market and My Portfolio). Owner decisions: each person starts with practice cash by growth level (1,000,000 / 5,000,000 / 10,000,000, set in Settings > Practice market), separate from Merit points; prices move by admin-scheduled market states (calm, rally, sell-off, rate shock) and a calendar. **Market**: 14 fictional instruments (shares, bonds, bills, money market, funds), prices worked out from the clock and market state so everyone sees the same price, today's change, a restricted share the Group "advises on". **My Portfolio**: cash, holdings, profit or loss, recent trades. Trading rules teach personal dealing: restricted list (cannot buy), holding period before a sale (30 minutes by default), daily trade limit, fee on every trade. The server sets the price and checks cash, holdings and limits inside one atomic update of the person's portfolio. Trades are allowed only when Work First allows world play. New route `/api/me/market` (own data), action `tradeAction` (re-checks the user), audit entry per trade, mission "Make a practice trade". 9 new tests (578 total), including two simultaneous buys that cannot spend the same cash twice.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 578 of 578 |
| 3 | Input validation | **Pass** | side, id and units strictly checked (whole number 1 to 1,000,000); price never taken from the browser |
| 4 | Authz, sessions, economy tampering | **Pass** | signed-in only; own portfolio only; atomic cash and holdings update; no Merit points involved |
| 5 | Secrets, audit, security review | **Pass** | no secrets; trades audited |

Not yet checked in a browser (types, lint and service tests only). Practice prices and names are fictional; no live data (RULEBOOK §3).

---

## C1: Work Phone people apps: Directory, Kudos, My Role (14 Oct 2026)
Scope: first of the "Coming soon" builds. **Directory** (search active colleagues by name, title or unit; shows name, title and unit only, never email; message or send kudos). **Kudos** (thank a colleague with an admin-set kind and an optional note that passes the chat word filter and blocks links; the giver pays nothing, so no points are transferred, in line with RULEBOOK §2.11; the game awards the receiver a small admin-set amount up to a daily cap; limits per day and one per colleague per day, enforced in one atomic update; notice to the receiver; audit entry). **My Role** (own title, unit, tenure, skill levels and unit courses still to do). New settings "Kudos" under Settings > Gameplay, new mission "Thank a colleague". New read route `/api/me/people` (signed-in, own and directory data only) and server action `giveKudosAction` (re-checks the user). 7 new tests (569 total).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 569 of 569 |
| 3 | Input validation | **Pass** | ids matched to a strict pattern, kind checked against settings, note cleaned, length-capped and filtered, directory search capped |
| 4 | Authz, sessions | **Pass** | route and action both need a signed-in user; no email or password data in the directory |
| 5 | Secrets, audit, security review | **Pass** | no secrets; kudos audited |

Not yet checked in a browser: the new phone screens (types, lint and service tests only). Open item: the direct-message check treats a lowercase staff id as a different id (no impact).

---

## E6: Online and activity counts in admin Reports (14 Oct 2026)
Scope: Reports shows people online now (the game heard from them in the last 2 minutes), sign-ins in 24 hours, active in 24 hours / 7 / 30 days, total hours played, shifts finished and leadership runs; the unit table gains "Online now" and the people table shows an online badge. Page views are not recorded by the app, so none are shown. Read-only, still behind the admin "reports" area check on the page; no new route or input. New test for the online count.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 562 of 562 |
| 3 | Authz, validation, secrets, audit, security review | **Pass** | unchanged access rule; counts only, no personal data added beyond the existing table |

---

## E5: Needs tab shows where to recharge (14 Oct 2026)
Scope: the "How to recharge" list in the Needs tab now also lists the room activities (dispenser, fridge with its price, pantry, wellness nook and so on), grouped by room. Read-only text built on the server from settings; no new input or route. Types, lint and the game, hunt, streak and notice tests pass (38 of 38); the full `npm run qa` ran for E4 just before.

---

## E4: Dispenser and fridge on every floor (14 Oct 2026)
Scope: each room's location bar gets a free Dispenser (cool water, hot drink) and a Fridge whose items cost Merit points (juice 3, fruit 3, snack 4, meal box 8). Activities gain an optional `cost` (default 0, editable in Settings > Room activities). The server refuses a costed activity when the person lacks the points, and takes the points when it is finished. Yaba lobby now has a bar too. New test covers free dispenser and refused fridge item.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 561 of 561 (store concurrency test times out only under load; passes alone) |
| 3 | Validation, authz | **Pass** | cost is validated by schema and checked on the server |
| 4 | Secrets, audit, security review | **Pass** | no new inputs or routes |

---

## E3: Admin link on the game screen (14 Oct 2026)
Scope: a visible Admin button next to the Admin preview chip on the game screen (shown only when the person is an admin; the admin pages still check the role on the server). Types and lint clean; full `npm run qa` was run for E2 on the same code apart from this link.

---

## E2: More Academy scenarios and case studies (14 Oct 2026)
Scope: 14 new decisions and 7 new written cases across seven built-in courses (money laundering, confidentiality, law and regulation, wealth management, stockbrokers, customer experience, capital). Content only; validated by the existing course schema. A database that was seeded earlier picks the new content up after the Academy seed marker is cleared (or when the admin adds them in the course editor).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 560 of 560 |
| 3 | Validation, authz, sessions, headers, secrets, audit | **Pass** | unchanged; content only |
| 4 | Security review | **Pass** | no new attack surface |

---

## E1: Much more content and new mission events (14 Oct 2026)
Scope: engagement review (docs/ENGAGEMENT.md) and content. Shift situations 21 to 59, room activities (new Wellness nook, Help corner, Information desk, Workspace room), daily clues 8 to 33, leadership cases 7 to 15, client-simulation cases 12 to 24, missions 11 to 32. New mission events (shift, lead, sim, clue, decorate, chat) are counted by the server after the action succeeds; a failure to count never blocks the action. No new inputs, routes or permissions; all content is validated by the existing schemas.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 560 of 560 (one load-related timeout in the store test passes alone) |
| 3 | Input validation, authz, sessions, headers | **Pass** | unchanged; content only |
| 4 | Secret scan, `npm audit` | **Pass** | in `npm run qa` |
| 5 | Security review | **Pass** | no new attack surface |

---

## P5: Two-step sign-in, instant mission swaps, README and status notes (14 Oct 2026)
Scope: priority items 15, 10 (part) and 12. (15) Two-step sign-in with an authenticator app (time-based codes, RFC 6238): set up on Account > Two-step sign-in with a key and a first code, ten single-use recovery codes shown once, a code can be used once only, wrong codes count towards the account lock and are rate limited, turning it off needs the password and a current code, an admin can reset it for someone who lost their phone, and a setting (Settings > Sign-in rules) can require it for anyone who opens the admin area. The secret is encrypted with a server key (TOTP_KEY, needed in production). (10) Mission swaps now show their result at once: the server sends the mission a swap would bring and picks the same one. (12) README rewritten; PRD, workplan and the Lagos Life review carry a status note.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 560 tests: RFC 6238 vectors, window and replay, sealed secret, recovery codes once, needs the code after the right password, a code alone is never enough, lock after repeated wrong codes, turn off and admin reset; swap preview equals the real swap |
| 3 | Security review | **Pass** | Password is checked first; codes rate limited; no secret in logs; recovery codes only stored as hashes; production refuses to set up without a key; sessions are ended when it is turned off or reset |
| 4 | Real browser | **Pass** | Throwaway user: set up with a real code, recovery codes shown, signing out and in again asks for the code; a bug where the recovery codes vanished after setup was found and fixed |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Open: set `TOTP_KEY` (32 random bytes, base64) before using two-step sign-in in production; there is no QR picture (the key can be typed or opened as a link); email-code two-step is not built.

---

## P4: Travel between offices (14 Oct 2026)
Scope: priority item 9. A Yaba office room (sample layout until photos are supplied) and rides between offices: on the map, the Yaba pill opens a card with the ways to travel (personal car, official pool car, ride-hailing, with their costs from Settings > Transport options) and a Go button. The ride shows like the reference: vehicle, route, time to go, anything on the road (a go-slow, rain or clear roads, chosen by the server), Skip ride and Turn back (both switchable under Settings > Travel). The cost is paid at the start and not refunded on turning back; no walking about while on a ride; a ride in progress is resumed after a refresh. Lagos offices only.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 549 tests: cost charged, time kept on the server, early arrival refused, skip allowed or refused by setting, turn back, same-building and bad requests refused, not enough points, one ride at a time, no moving about on a ride |
| 3 | Authorisation and validation | **Pass** | Every action re-checks the signed-in user; destination, mode and cost are decided on the server; floor access and play hours still apply |
| 4 | Real browser | **Pass** | Throwaway user: Yaba card lists the three ways to travel, a pool-car ride starts and shows the ride card with a road event, Skip ride arrives in the Yaba office, no console errors; user removed |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Open: Yaba is a sample room until photos arrive; other cities are not enabled; ride art is a card, not the reference's driving view.

---

## P3: Chats and groups with moderation (14 Oct 2026)
Scope: priority item 8. The Work Phone Messages app now has working Chats (direct messages, found by name) and Groups (everyone, each pilot unit, a learning corner). Safety: messages are cleaned and checked against an admin-editable word list (look-alike letters and spaced-out letters caught, the blocked word is never repeated back), links are blocked, speed is limited, anyone can report a message with a reason, enough reports hide it until the review team decides, admins can remove a message and pause the sender for a day or a week, and the sender is told. Direct messages are private to the two people; the review team only sees a reported message with a few around it. Admin: Admin > Chat reports (concerns area: admins and reviewers), settings under Settings > Chats and groups.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 528 tests: filter, links, cleaning; group access by unit; private direct messages; rate limit; reports hide, remove, dismiss, mute and unmute; only the review team can read or act |
| 3 | Authorisation and validation | **Pass** | Conversation ids validated; membership checked on every read and write; review actions need the concerns area; reads are plain requests that answer only about the signed-in person |
| 4 | Real browser | **Pass** | Throwaway user: groups list for their unit, a message is sent and shown, a blocked-word message is refused with a polite note, no console errors |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Open: the starting word list is short and mild: the owner and HR should extend it; messages are fetched every four seconds while a chat is open (no live push yet); attachments and images are not allowed.

---

## P2: Evidence storage and scanning, 3D Workspace items, and faster reads (14 Oct 2026)
Scope: priority items 11, 14 and part of 10. (11) Concern evidence goes through a virus scan before it is stored (a scanner service reached by address; infected files are refused and logged; unreachable scanner or none in production keeps the file "pending" and admins cannot open it until a clean scan) and is stored in a private Supabase bucket when configured (otherwise the database); older files stay readable. (14) Bought items are drawn as 3D shapes (desk with screen, chair, sofa, plant, lamp, screen, frame, rug, shelf, table, cabinet) with a colour set per item in the catalogue, instead of emoji pictures; the shape and colour are admin settings. (10) Server Actions from one browser run one at a time, so a slow move or purchase made other screens wait; the read-only screens (game state, Workspace items, room activities, shift, simulators) now use plain requests that run side by side, each checking who is asking and never cached. A stale room bar no longer shows after moving to another room.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 516 tests: scan clean, skipped, infected, pending then clean or infected; storage keys and calls; read requests refuse signed-out and unready users, answer only about the signed-in person, never cached |
| 3 | Security | **Pass** | Files are private and only handed to an admin as a download; scanner and storage keys are server-only environment settings; keys are validated; no new public data |
| 4 | Real browser | **Pass** | Throwaway user with ten items: all shapes drawn in My Workspace, decor appears while a slow move is still being confirmed, no console errors |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Open: a real scanner service and the storage bucket must be set up before rollout (see DATABASE-SETUP); trimming the number of database trips per write is still to do.

---

## P1: Reports gaps, succession planning and client simulation (14 Oct 2026)
Scope: priority items 13, 7 and 6. (13) Reports now include play minutes, shifts finished and leadership runs per person (also in the CSV), from running totals kept on each record. (7) Succession: Admin > Succession (admins and the learning team) lists each line manager's role, named successors with how soon they could be ready, suggestions from the same unit with at least 3 years' service ranked by leadership results, certificates and lessons, and who still owes the leadership simulator; line managers see a "Required" banner in the Academy until they have done it within the refresh period (180 days by default; settings). (6) Client simulation: the leadership engine now serves two simulators; the client simulation deals each person cases for their unit (Customer Experience, Wealth Advisory, Investment Advisory, plus ones for everyone) with meters for client trust, compliance, revenue and risk control; admin-editable under Settings.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 508 tests: totals, succession rules and access, mandatory simulator, client cases dealt by unit, separate totals |
| 3 | Authorisation | **Pass** | Succession is its own admin area (admin and learning team only), checked on the page, the actions and in the service |
| 4 | Input validation | **Pass** | Nomination role, person, readiness and note validated; successor tenure enforced; settings checked by strict schemas |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Open: succession and the client simulation are covered by tests but not yet driven in a browser; the client cases are drafts for the business owners to review.

---

## M8: Daily clue and leadership simulator browser check (13-14 Oct 2026)
Scope: the daily clue from the reference "Daily gem hunt", adapted: a riddle on the Goals tab that points to a room in the building; arriving in that room pays Merit points once (more if found within the first minutes after the clue is first shown). Same clue all day, different each day; the room is never sent to the browser before it is found; clues, points and the fast window are admin settings. Also: the leadership simulator was driven in a browser (start a run, decisions change the meters).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | Clues valid and pointing to real rooms; same clue all day; room never revealed; fast and later rewards; paid once |
| 3 | Security | **Pass** | Server decides arrival, time window and points; hidden room; a failure never breaks travel |
| 4 | Real browser | **Pass** | Goals tab shows the clue, hint and points; leadership run starts and meters change; no console errors; throwaway users removed |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Notes: there is no ranking among players (the reference ranks by who found it first); the reward depends on how soon after the clue was shown. Not built: Meristem Stories.

---

## S1: More instant actions (13 Oct 2026)
Scope: owner request "instant in the browser, server stays the judge", second step. Using a spot (coffee, water, lunch...), greeting or helping a colleague, claiming a mission reward and taking the daily bonus now show their result on screen at once; the server's answer then replaces the screen's numbers, and a refusal puts things back with a message. The server still decides everything and sends the numbers the screen needs (what each action does, what a claim does).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 493 tests, including the prediction rules (effects, cost, cooldown, limits, refusals) |
| 3 | Security | **Pass** | Nothing the browser predicts is trusted: points, needs and cooldowns are set by the server on every action |
| 4 | Real browser | **Pass** | Throwaway user: game loads, map to open-plan floor is instant, no console errors; the spot click itself was not driven in the browser run |

Notes: swapping a mission and shift answers wait for the server because the server picks the result. The main remaining delay in development is the database round trip (about half a second to a second per query from this computer).

---

## A4: Academy course form editor and admin pages on phones (13 Oct 2026)
Scope: the Academy course editor now uses the same form editor as the settings (lessons, notes, questions at three levels, scenarios, case studies, lesson video), with JSON under Advanced; the admin header no longer pushes pages sideways on a phone.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 491 tests (the course rules are the same ones the form is drawn from) |
| 3 | Authorisation | **Pass** | Course pages and save action still check the Academy area; the server validates every value on save |
| 4 | Real browser | **Pass** | Throwaway admin: a built-in course opens as a form (34 fields, lessons collapsible) and saves; four admin pages at 390 wide have no sideways scroll; no console errors |

---

## A3: Manager screen and admin roles (13 Oct 2026)
Scope: third piece of the admin backend. (1) My team (/manager) for line managers and admins: their own unit's progress, extra learning time (existing weekly limit), and Academy courses assigned with a due date and note; the person is told in their updates and sees "Assigned to you" on their Academy home; assignments can be removed. (2) Roles: a new learning and development role (reports, Academy, announcements, placements) and the reviewer role limited to conduct concerns; admins keep everything. Every admin page and every admin action now checks its own area (the layout only builds the menu).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 491 tests: manager sees only their own unit and not themselves; admin may pick a unit; players and unready managers refused; course assignment rules (unit, self, dates, unknown course); notices; Academy home; roles and areas; services refuse the wrong role |
| 3 | Authorisation | **Pass** | Area checks on every page, route and action, plus a second check inside the services; settings, staff and audit pages that used to rely on the layout alone now check too |
| 4 | Input validation | **Pass** | Due date format, note length and control characters, minutes range, unit and course ids validated on the server |
| 5 | Real browser | **Pass** | Throwaway manager: My team lists the unit, assigning time and a course works; switched to the learning team role: settings and staff send them home, reports opens, menu shows only their areas; users and test rows removed |
| 6 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Notes: "team" means the manager's own unit (the existing rule); a separate manager-of field is not added. Managers do not see concerns or settings.

---

## A2: Form editors for every setting (13 Oct 2026)
Scope: second piece of the admin backend. Every setting under Admin > Settings now opens as a form drawn from its own rules: number boxes with limits, drop-downs, checkboxes, text boxes, and lists with add, remove, duplicate and move up or down; the raw JSON is still there under "Advanced: JSON". One component covers all settings (shifts, room activities, Workspace catalogue, leadership, gameplay, Work First, phone apps, levels, terminology, Academy groups and more).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 481 tests: a form can be drawn for every setting; blank values for new list items; defaults pass the real rules |
| 3 | Input validation | **Pass** | The form only builds JSON; the server checks it against the same strict rules before saving, so the form can never save an invalid value |
| 4 | Authorisation | **Pass** | Saving still goes through the admin-only save action |
| 5 | Real browser | **Pass** | Throwaway admin: Work shifts form renders and saves a changed number; ten other settings render with no console errors; test setting removed afterwards |

Notes: the first page version passed a non-plain object to the browser and logged an error; fixed by sending plain data only. Course editing still uses its JSON editor (next to do if wanted).

---

## A1: Admin reports and progress dashboard (13 Oct 2026)
Scope: first piece of the admin backend (order agreed with the owner: reports, then friendly editors, then manager and L&D roles). New Admin > Reports page: totals, by unit, by course, and a searchable people table (points, career level, streak, lessons passed, certificates, last seen), plus a CSV download.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 478 tests: counts by person, unit and course; spreadsheet cells safe from formulas and quotes; no passwords in the export |
| 3 | Authorisation | **Pass** | Page and export both call `requireRole("admin")`; each export is written to the audit log |
| 4 | Input validation | **Pass** | Search and unit filter are single trimmed, length-capped values used only to filter |
| 5 | Real browser | **Pass** | Throwaway admin: page renders with real data, CSV downloads (200, text/csv); user removed |
| 6 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Open: on a phone the admin pages scroll sideways (older admin layout, not specific to this page); reports do not yet include play time, shifts or leadership runs because those are not stored per person.

---

## M7c: Buy mode over the live room, Today's Hustle upgrades, leadership simulator and speed (13 Oct 2026)
Scope: (1) Buy mode now keeps the live Workspace room on screen with the Catalogue sliding up over it, like the reference: pick an item, a ghost appears in the room, move it with the arrows or keys, turn it, then Place, Place + 1 more or Cancel; things are bought when placed; "In storage" and "In my room" tabs; cards are aligned (size and stars, picture, name, help line, price in the same places). (2) Goals tab: 7-day streak with reward days, a daily mission swap, Easy/Medium/Hard tags and a "New missions in" countdown. (3) Leadership simulator in the Academy: meters, decisions with consequences, rating and points; admin-editable. (4) Speed, owner request "instant in the browser, server stays the judge": moving between rooms is instant in the browser and confirmed by the server in the background (put back if refused); room activity timers start at once; settings are cached in the server for 15 seconds (cleared at once when an admin saves); Buy mode opens with data loaded ahead.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 475 tests: rotation and buy-and-place rules, streak and swaps, leadership rules and runs |
| 3 | Authorisation and validation | **Pass** | Server still decides price, ownership, bounds, points, streak and ratings; browser only predicts and is corrected |
| 4 | Real browser | **Pass** | Throwaway user: Catalogue over the live room, ghost placed with arrow keys and R, Place charges points, price rows aligned, no horizontal scroll, no console errors |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Notes: RULEBOOK 2.8 (server-authoritative scoring) is kept: the owner chose the "instant in the browser, server stays the judge" option. Each database trip from the development computer takes about half a second to a second, so server actions still take 2 to 7 seconds in development; hosting the database in the same region as Vercel is the main remaining fix. The leadership simulator and Hustle upgrades were checked by tests only, not yet in a browser.

---

## M7b: Bought items shown in My Workspace (13 Oct 2026)
Scope: a new room, My Workspace (reached from the Workspace button, the open-plan floor, or the map); what the person buys and places in Buy mode is drawn into the room in both the 3D and Lite views; the decoration area is limited to the room size (at most 10 by 8 tiles). Things are walk-through, so nobody can be boxed in.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 461 tests, including the room, placement inside it, and other rooms left alone |
| 3 | Real browser | **Pass** | Throwaway user: Workspace button travels to the room, a bought palm appears in it, no console errors; user removed |
| 4 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Notes: items are pictures on a base, not full 3D models; only one of the four items bought in the browser run was placed (the others were clicked while the previous purchase was still saving), the rest is covered by tests.

---

## M4b: Location bar with zones and timed activities, and the session limit only in working hours (13 Oct 2026)
Scope: (1) a location bar in each room, like the reference: the room's name and a line about it, its zones as tabs, activity cards with a timer, what they lift and the points they earn; the time is kept on the server and the reward is collected once. Rooms, zones and activities are admin settings. (2) Owner decision: the 30-minute play limit now applies only in working hours, 8:30 am to 4:30 pm on working days; after 4:30 pm, before 8:30 am, at weekends and on holidays there is no session limit. Core hours default changed to 08:30 to 16:30, and the limit has an admin switch (`onlyInCoreHours`).

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 445 tests: activities (valid content, zones, server timer, pay once, cooldown, one at a time, wrong room, cancel); session rules (limit inside working hours, none outside them, boundaries at 08:30 and 16:30) |
| 3 | Authorisation and validation | **Pass** | Every action calls `requireUser`; start, finish and cooldown are decided on the server; settings checked by strict schemas |
| 4 | Real browser | **Pass** | Throwaway user: open the bar, zone tabs, start an activity, countdown, cooldown after finishing, no horizontal scroll on a phone, no console errors; user removed |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Notes: `pg.test.ts` timed out once while another test run was using the machine and passed on its own and on the next full run. Open: room chat is deliberately not built (needs moderation first); older saved Work First settings keep their own core hours until an admin changes them.

---

## M4a: Go to work shifts (13 Oct 2026)
Scope: a Go to work button starts a shift; a shift card shows the time left and progress; workplace situations appear through the shift, each with choices scored on the server; the shift pays Merit points and skill XP when the time is up, and leaving early pays nothing. Length (8 minutes by default, raisable up to a full day), situations per shift, shifts a day, points and the 21 starting situations (Customer Experience, Wealth Advisory, Investment Advisory and everyone) are admin settings.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 438 tests; shifts: valid content, drawing, spacing, hidden answers, one active shift, daily limit, server scoring once, pay only at the end, early leave pays nothing |
| 3 | Authorisation and validation | **Pass** | Every action calls `requireUser`; verdicts and choice order are decided on the server; answers never reach the browser before answering; settings checked by a strict schema |
| 4 | Real browser | **Pass** | Throwaway user: start a shift, card and countdown, situation pop-up, answer, result, no horizontal scroll on a phone, no console errors; user removed |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Open: the commute ride (car, pool car, Uber) is not built; situations are drafts for the business owners to review; a shift is not yet tied to Work First hours beyond the existing play gate.

---

## M7a: Workspace decoration (Buy mode) and the break countdown (13 Oct 2026)
Scope: Buy mode built from the reference: Workspace from above, Catalogue with tabs (Desk, Comfort, Plants, Tech, Wall art, Light), item cards with size, stars and price in Merit points; people choose to place things themselves on a tile grid or have them placed; some items slow how fast a need falls (capped, set by the admin); catalogue editable under Settings. The break screen now shows a live countdown and a button to go to the Academy.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 426 tests; decoration: price check, refusals, overlap and bounds, ownership, auto-place, need help cap, tampered record |
| 3 | Authorisation and validation | **Pass** | Every action calls `requireUser`; the server decides price, ownership, bounds and overlap; stored data is healed on read; catalogue checked by a strict schema |
| 4 | Real browser | **Pass** | Throwaway user: open Buy mode, buy, place on tiles, balance falls, phone width has no horizontal scroll, no console errors |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |

Open: items are drawn as emoji on the grid, not yet in the 3D Workspace room; "place for me" was covered by tests but not by the browser run.

---

## M6a: Illustrated city map with pills (13 Oct 2026)
Scope: the map is now an illustrated Lagos map like the reference game's, with city tabs (Lagos, and Port Harcourt and Abuja marked as coming later) and name pills: Meristem HQ (opens the floor and room list), Yaba office (opening later), Meristem Academy (place card, then the full-screen Academy), and scenery names.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `tsc` and `eslint` clean |
| 2 | Real browser | **Pass** | Throwaway user: map pills, Abuja note, HQ sheet, Academy card, Academy at 1366 and 390 wide, no horizontal scroll, no console errors; user removed afterwards |

Open: the map art is a first pass; Yaba photos still needed; new built-in courses reach an existing database through Admin > Academy > Restore missing built-in courses.

---

## M5c: Academy moved to the map as its own page, with lesson videos (13 Oct 2026)
Scope: Academy removed from the Work Phone; a Meristem Academy entry on the map opens a place card and then a full-screen Academy page (wide on desktop, one column on phones); optional lesson video (YouTube, Vimeo, Microsoft Stream or SharePoint link, or a direct https mp4/webm), shown in the notes.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 418 tests, including video link parsing (allowed hosts, rejects http, scripts, credentials) |
| 3 | Input validation | **Pass** | Video link validated by the course schema and parsed again before display |
| 4 | Headers | **Pass** | CSP gains `frame-src` for the allowed video hosts only and `media-src https:`; scripts unchanged |
| 5 | Security review | **Pass** | Only allowlisted embeds; YouTube uses the no-cookie host |

Open: not yet checked in a real browser at desktop and phone widths; uploaded video files come later with file storage.

---

## M5b: Academy per-course storage, admin Academy pages and the imported NEO content (13 Oct 2026)
Scope: courses stored one per record with a light index; admin Academy pages (list by group, edit as JSON, move between groups, delete, restore built-ins); imported content from the NEO decks: Culture, Compliance, Products and Services, Customer Experience and More to learn (16 courses) with Easy/Medium/Hard questions, extra scenarios and written case studies.

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Build, types, lint | **Pass** | `npm run qa` clean |
| 2 | Tests | **Pass** | 19 files, 415 tests, including content validity, question counts per level and no repeated questions |
| 3 | Input validation | **Pass** | Course JSON checked by the strict course schema and size limit before saving |
| 4 | Authorisation | **Pass** | Every Academy admin action calls `requireRole("admin")` |
| 5 | Dependencies | **Pass** | `npm audit --omit=dev`: 0 vulnerabilities |
| 6 | Secret scan | **Pass** | No credentials in the changed files |
| 7 | Security review | **Pass** | Answers stay on the server; no new public endpoints |

Open: business owners to confirm service standards quoted from the decks (response times, call rules) are current.

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
