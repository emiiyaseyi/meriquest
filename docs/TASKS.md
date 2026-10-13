# MeriQuest: master task list

Everything the owner has asked for, in one place, so nothing goes missing. `[x]` done and pushed, `[~]` in progress, `[ ]` open, `[?]` waiting on the owner. Kept up to date with every piece of work. The decisions behind these are in [RULEBOOK.md](RULEBOOK.md); test and security results are in [QA-LOG.md](QA-LOG.md).

## Foundations
- [x] Study the reference game (Lagos Life) and write the rulebook so nothing drifts
- [x] Full production app (Next.js, TypeScript, server-side sign-in, admin settings, tests)
- [x] Meristem brand: logo untouched, light-only, brand greens
- [x] Starting-path questionnaire (one question at a time, dispute and retake, admin can disable)
- [x] Everything an admin may want to change is a setting, not hard-coded
- [x] Work First: play any time with a session limit (30 minutes, then a 2-hour pause, admin-editable); learning allowed outside hours
- [x] Sign-in fixes; shared default password kept; /game prototype retired
- [x] Database: Prisma Postgres for development (temporary)
- [ ] Decide hosting (Netlify or Vercel) and the production database region with IT, Risk and the DPO
- [ ] Rewrite the review, PRD, workplan and README to match the rulebook

## The world
- [x] Ikoyi HQ in isometric 3D with a flat 2D Lite switch (3D is the default)
- [x] Turn the view without moving the character; skip a walk; click people, doors and objects
- [x] Timer in minutes and seconds; every pop-up closes when you click outside it
- [x] Map with place cards (things to do), floor chooser in the lift, restricted floors (Floor 2 closed for now)
- [?] What each Ikoyi level is used for (Ground, Mezzanine, Floors 1 to 6): owner to explain
- [?] Yaba office: owner to supply photos
- [ ] Travel between Lagos offices and to clients (personal car, pool car, Uber); no other cities yet
- [ ] Workspace decoration ("Buy mode", catalogue paid in Merit points; reference screenshots read)
- [ ] Location bar with zones and timed activity cards, locks and time windows (from the UNILAG reference)
- [ ] World map like the reference: city tabs (Lagos first), illustrated map with place pills, tap a pill for its card

## People and play
- [x] Characters redrawn like the reference (proportions, hair, outfits, fabrics) and the appearance editor
- [x] Me panel (Profile, Needs, Goals, Skills, People, Career, Settings), person card, keyboard shortcuts
- [x] Eight needs with ways to recharge each; Feelings; Skills with levels; Today's Plan missions
- [x] Colleague interactions: Say hello, Share a tip, Call for support, Buy a drink
- [x] Report a conduct concern (statement, evidence, timestamps) to the admin team, with admin review
- [ ] Work shift ("Go to work"): decision cards, mini-games, settlement
- [ ] Leadership simulator (mandatory for line managers) and succession planning (3+ years)
- [ ] Client simulation: CX, Wealth Advisory and Investment Advisory cases; markets, regulators, control functions
- [ ] Meristem Stories (narrative quests with dilemmas)
- [ ] Chats and groups between colleagues, with moderation
- [ ] Manager screen to assign learning time

## Work Phone, updates and Meristem Academy
- [x] Work Phone redesigned like the reference, Messages with Updates (notifications) and announcements from the admin team
- [~] Meristem Academy: groups, courses, lessons with a timed class, notes, quizzes at three levels that unlock as you pass (Easy, Medium, Hard), certificates, scenarios and case studies; open to every role, with role courses recommended (Customer Experience, Wealth Advisory, Investment Advisory) and general learning for everyone else
- [x] Import the NEO Slides 2024 folder into Academy content (admin can review and edit): 16 courses in Culture, Compliance, Products and Services, Customer Experience and More to learn, with Easy/Medium/Hard questions, extra scenarios and written case studies
- [~] Academy off the phone: a pill on the map opens a full-screen Academy page (desktop and phone layouts) with lesson videos (YouTube/Vimeo/Microsoft links; uploads later). Checked in a browser (desktop and phone)
- [ ] Keep adding scenarios, case studies and questions as the owner reviews (ongoing)
  - [x] Culture group (3 courses, 320 questions)
  - [ ] Compliance group
  - [ ] Products and Services group (one course per subsidiary)
  - [ ] Customer Experience group
  - [ ] Others (financial system, personal finance, strategy)
  - [ ] Scenarios and case studies from the NEO exam (both scored scenarios and written cases)

## Quality and safety
- [x] Every piece passes the QA and security gate before it is committed; results logged
- [x] Commits and pushes in the owner's name only, never any AI attribution
- [ ] Move concern evidence files to proper file storage with virus scanning before wide rollout
- [ ] Optional: database connection retry for DNS blips; Supabase MFA (low priority)

- [x] Workspace decoration: Buy mode with Catalogue, place yourself or auto-place, items that help needs (admin-editable)
- [ ] Show bought items inside the 3D Workspace room
- [x] Break screen: countdown and a button to the Academy

- [x] Go to work shift: shift card with timer, situations with scored choices, pay at the end, admin-editable length and situations
- [ ] Commute ride (car, pool car, Uber) before a shift
- [ ] Review the shift situations with the business owners
