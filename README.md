# MeriQuest

A life-simulation learning game for Meristem Securities Limited staff. It combines **technical** and **soft-skills** development in realistic workplace scenarios across the Group's 7 subsidiaries.

> **Status:** prototype v0.1 (draft content for SME and Compliance review). Not affiliated with or approved by Meristem until internal sign-off.

## What's in this repo

```
game/                 Playable prototype (plain HTML/CSS/JS, no build step)
  index.html          Entry page
  auth-config.js      Sign-in settings: default password, email domain, staff ID format, lockout
  staff.js            Sample staff directory (fictional people) loaded on first run
  auth.js             Sign-in, password change, admin panel (staff & access)
  content.js          Learning content: tracks, scenarios, quizzes, competencies, values
  clients.js          Office segments, personality styles, signature clients
  clientgen.js        Client generator: case library, channels, tiers, moods, locations
  engine.js           Game engine: state, scoring, missions, rendering, xAPI-style log
  styles.css          Styles (light + dark, mobile-first)
docs/
  PRD.md              Product requirements
  WORKPLAN.md         Phased delivery plan, team, milestones
  CAREER-TRACKS.md    Career tracks and technical + soft skills matrix by role
  LAGOS-LIFE-REVIEW.md  How Lagos Life is played, what to copy/avoid, gap analysis, decisions
  CLIENT-SIMULATION.md  Client personality sims, generator, office segments, KPIs
  templates/CLIENT-CASE-TEMPLATE.md  How to share CX cases (anonymised)
.claude/launch.json   Local preview config (python http.server)
```

## Run it locally

Any static web server works. From the repo root:

```bash
python -m http.server 5173 --directory game
```

Then open http://localhost:5173. Progress is saved in your browser (localStorage), separately for each staff member. Use **L&D report → Reset progress** to start again.

## Signing in (prototype)

- Sign in with a **staff ID** (e.g. `MS1001`) or **work email**, plus a password.
- Every new or reset account uses the **default password** set in [`game/auth-config.js`](game/auth-config.js). At first sign-in the person must create their own password. **Change the default before sharing the prototype.**
- Sample accounts are in [`game/staff.js`](game/staff.js). `MS0001` is the L&D admin. Each sample person has a unit, office and starting track.
- **Admin panel** (⚙️ Admin in the top bar, admins only): search staff, reset a password to the default, unlock locked accounts, disable/enable, change roles, add staff, import/export CSV, and view the audit log.
- Accounts lock for 15 minutes after 5 failed attempts (configurable).
- Prototype only: accounts live in this browser, and passwords are stored salted and hashed (SHA-256). **Production must move sign-in to the server** (staff ID/email + password, hashed server-side; see docs/PRD.md §8–10).
- To wipe all local accounts and progress, clear the site data for `localhost:5173` in your browser.

In VS Code you can also use the **Live Server** extension: right-click `game/index.html` → *Open with Live Server*.

## Move it to GitHub

```bash
git init
```

```bash
git add . && git commit -m "MeriQuest prototype v0.1"
```

```bash
gh repo create meriquest --private --source . --push
```

Keep the repository **private** (or in your organisation's GitHub account) until Corporate Communications and Compliance have approved the content and branding.

### Quick hosting options for playtests
- **GitHub Pages** (Settings → Pages → deploy from the `/game` folder via a GitHub Action). Note that a private repo needs a paid plan for Pages.
- **Azure Static Web Apps** or the company intranet. Upload the four files in `/game`.

## Editing content

All scenarios live in `game/content.js`. To add one, copy an existing scenario object inside a track's `scenarios` array and change:
- `id` (unique), `title`, `location` (one of the `locations` ids), `type` (`Technical` | `Soft skill` | `Blended`)
- `who`, `text`
- `choices`: one `best`, one `ok`, one `poor`, each with `fx` (competency deltas, `trust`, `compliance`, `energy`), `outcome` and, for the best choice, a CEPOEM `value`
- `coach`: the teaching point

Reload the page to play it.

## Production roadmap
See [docs/PRD.md](docs/PRD.md) §10 for the recommended stack (Next.js + TypeScript on Netlify, Supabase Postgres/Realtime, staff ID/email + password sign-in, xAPI) and [docs/WORKPLAN.md](docs/WORKPLAN.md) for the phases.
