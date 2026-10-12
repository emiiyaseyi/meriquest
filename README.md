# MeriQuest

A life-simulation learning game for Meristem Securities Limited staff. It combines **technical** and **soft-skills** development in realistic workplace scenarios across the Group's 7 subsidiaries.

> **Status:** prototype v0.1 (draft content for SME and Compliance review). Not affiliated with or approved by Meristem until internal sign-off.

## What's in this repo

```
game/                 Playable prototype (plain HTML/CSS/JS, no build step)
  index.html          Entry page
  content.js          ALL learning content: tracks, scenarios, quizzes, competencies, values
  engine.js           Game engine: state, scoring, missions, rendering, xAPI-style log
  styles.css          Styles (light + dark, mobile-first)
docs/
  PRD.md              Product requirements
  WORKPLAN.md         Phased delivery plan, team, milestones
  CAREER-TRACKS.md    Career tracks and technical + soft skills matrix by role
.claude/launch.json   Local preview config (python http.server)
```

## Run it locally

Any static web server works. From the repo root:

```bash
python -m http.server 5173 --directory game
```

Then open http://localhost:5173. Progress is saved in your browser (localStorage). Use **L&D report → Reset progress** to start again.

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
See [docs/PRD.md](docs/PRD.md) §10 for the recommended stack (Next.js + TypeScript, PostgreSQL, Microsoft Entra ID SSO, xAPI) and [docs/WORKPLAN.md](docs/WORKPLAN.md) for the phases.
