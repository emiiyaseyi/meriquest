# MeriQuest

A multiplayer life-simulation **learning game** for Meristem Securities Limited. People walk an isometric Meristem office, meet colleagues, look after their needs, take courses in the **Meristem Academy**, handle realistic work situations, and build skills that feed development and succession planning. It teaches technical and soft skills together, uses fictional data only, and is for development, never for pay or ratings.

> **Read [docs/RULEBOOK.md](docs/RULEBOOK.md) first.** It holds the locked decisions and overrides every other document. The running to-do list is [docs/TASKS.md](docs/TASKS.md) and every piece of work is recorded in [docs/QA-LOG.md](docs/QA-LOG.md).

## What is built

- **World:** isometric (3D look) rooms with a Lite 2D mode; rotate the view; walk, skip walking, click people, doors and objects. Ikoyi HQ sample rooms, **My Workspace** (a room you decorate), a sample Yaba office, an illustrated Lagos map with city tabs.
- **Life:** eight needs that recharge at coffee points, water, lunch, rest and the library; colleague interactions; feelings, skills and Today's Plan with a 7-day streak, mission swaps and a daily clue; career level from Merit points.
- **Doing work:** Go to work shifts with timed situations and scored choices; a location bar with zones and timed activities in each room; rides between offices; the leadership simulator and the client simulation.
- **Meristem Academy:** 18 imported NEO courses in five groups, with Easy, Medium and Hard quizzes that unlock as you pass, timed classes, notes, optional lesson video, scenarios, case studies and certificates.
- **Work Phone:** Messages (chats and groups with moderation), Updates, announcements, Academy and plan shortcuts.
- **Buy mode:** a catalogue paid in Merit points, ghost placing in the live room, 3D shapes, and items that help needs.
- **Safety:** conduct-concern reports with evidence (virus-scanned, private storage), chat filter and reports, Work First play rules, server-side checks everywhere.
- **Admin:** staff and access, placements, **form editors for every setting**, Academy course editor, reports with CSV export, announcements, concerns and chat reports, succession planning, audit log; roles for admin, learning and development, reviewer and manager (My team).

## Layout

```
app/                  The product (Next.js 16, React 19, TypeScript, Postgres)
  src/app/            Pages, Server Actions, read-only data routes (/api/me/...)
  src/components/     Game screens, admin forms, the settings form editor
  src/lib/            Rules shared by browser and server (pure functions)
  src/lib/server/     Server only: services, settings registry, store, auth
  test/               Vitest tests (about 550)
docs/                 Rulebook, PRD, workplan, task list, QA log, setup guides, reference screenshots
game/                 The first prototype (retired; do not edit)
```

## Run it locally

```bash
cd app
npm install
cp .env.example .env.local      # then fill in the values (see docs/DATABASE-SETUP.md)
npm run dev                     # http://localhost:3000
```

Useful checks: `npm run qa` runs types, lint, tests and a production build; `npm audit --omit=dev` checks dependencies. Stop the dev server before `npm run qa`, then start it again.

Settings, secrets and the database are described in [docs/DATABASE-SETUP.md](docs/DATABASE-SETUP.md) and [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md). Never commit `.env.local` or print its values.

## How it is built (short)

- **Server decides, browser shows.** Points, levels, answers, prices, cooldowns, shifts and ratings are decided on the server. The browser may show a result at once and is corrected if the server disagrees (RULEBOOK 2.8).
- **Settings, not hard-coding.** Anything an admin may want to change is a validated setting with a form editor (RULEBOOK section 4).
- **One store.** A small key-value interface over Postgres (file or memory for development and tests).
- **Every change passes the QA and security gate** in RULEBOOK 5.1 before it is committed.

## Hosting

Vercel (owner decision, 14 October 2026), Postgres on Supabase. The database should be in the same region as the Vercel functions for speed. Keep the repository private: it contains internal training material.

## Where things are decided

| Question | Read |
|---|---|
| What is locked, what is open | docs/RULEBOOK.md |
| What to do next | docs/TASKS.md |
| What was checked and how | docs/QA-LOG.md |
| Product requirements | docs/PRD.md (see its status note) |
| Phases and plan | docs/WORKPLAN.md (see its status note) |
| How the reference game works and what we copied | docs/LAGOS-LIFE-REVIEW.md (see its status note) |
| Academy content import | docs/ACADEMY-IMPORT.md |
