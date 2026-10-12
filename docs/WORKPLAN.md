# MeriQuest: Workplan

Draft v0.1, 12 October 2026. Indicative timeline: **about 9 months from approval to Group-wide rollout**, then a continuous content cycle.

---

## 1. Phases at a glance

| # | Phase | Weeks | Key outputs | Exit gate |
|---|---|---|---|---|
| 0 | **Mobilise and discover** | 1–3 | Sponsor, steering group, SME roster, validated competency framework, success metrics, DPIA started | Steering group approves scope and metrics |
| 1 | **Prototype validation** | 3–6 | Prototype (this repo) played by 20–30 staff; feedback; content style guide; scenario template | ≥ 70% of testers would use it weekly |
| 2 | **MVP build** | 6–16 | SSO, server saves, admin authoring + approval workflow, manager dashboard, xAPI, Wave 1 content (4 tracks × 10–12 scenarios) | Security test passed; Compliance sign-off on all content |
| 3 | **Pilot** | 16–22 | 80–120 staff: one intern cohort, one MSP cohort, new hires from 2 subsidiaries, one team-lead cohort | Pilot KPIs met (see PRD §11) |
| 4 | **Scale** | 22–36 | Wave 2–3 tracks (Guardian, Analyst Edge, Floor Ready, Registrar, Trustees, Capital, Finance, Legacy); cohort features; seasonal events | ≥ 60% of eligible staff enrolled |
| 5 | **Run and improve** | 36+ | Monthly content drop, quarterly regulatory review, Boardroom track, AI role-play pilot | Annual L&D impact review |

```
Weeks      1   4   8   12  16  20  24  28  32  36
Phase 0   ███
Phase 1     ████
Phase 2         ██████████████
Content    ██████████████████████████████████████  (continuous)
Phase 3                       ████████
Phase 4                               ██████████████
```

---

## 2. Detailed tasks

### Phase 0: Mobilise and discover (weeks 1–3)
- [ ] Confirm the **executive sponsor** (e.g. Deputy GMD or Group Head HR) and the **product owner** (L&D).
- [ ] Form the steering group: L&D, HRBPs, one SME per subsidiary, Compliance, IT/InfoSec, Corporate Communications.
- [ ] Interview 2–3 top performers per priority role to capture the "moments that matter".
- [ ] Validate the 10-competency framework against existing job descriptions and appraisal forms.
- [ ] Agree success metrics and baselines (KYC exceptions, MSP confirmation rate, time-to-productivity, successor coverage).
- [ ] Start the **DPIA** (NDPA 2023) and agree the data-use policy (development-only).
- [ ] IT decisions: SSO provider, hosting tenant, LMS/LRS integration, GitHub organisation.

### Phase 1: Prototype validation (weeks 3–6)
- [ ] Host the prototype internally (GitHub Pages / intranet / Azure Static Web App).
- [ ] Run 3 playtest sessions (interns, graduates, team leads); collect survey data and observation notes.
- [ ] SMEs review all 24 prototype scenarios for accuracy; Compliance reviews the regulatory ones.
- [ ] Finalise the brand: name, visual identity, use of Meristem marks.
- [ ] Publish the content style guide and scenario template; train 2–3 internal authors.
- [ ] Write the backlog of user stories from the PRD; estimate; agree the MVP scope.

### Phase 2: MVP build (weeks 6–16, 5 × 2-week sprints)
| Sprint | Engineering | Content |
|---|---|---|
| S1 | Next.js + TypeScript scaffold, CI/CD, port the engine, design system | Wave 1 tracks expanded to 10–12 scenarios each |
| S2 | SSO, user/enrolment model, server-side saves, HRIS CSV import | SME review round 1 |
| S3 | Admin authoring UI, review/approval workflow, versioning | Compliance review round 1 |
| S4 | Manager dashboard, analytics views, xAPI statements → LRS/LMS | Quiz banks (8–10 items per track) |
| S5 | Accessibility pass, performance, penetration test, fixes, UAT | Final sign-off, pilot comms pack |

### Phase 3: Pilot (weeks 16–22)
- [ ] Launch event with the sponsor; cohort kick-offs.
- [ ] Pre-assessment (same items as post).
- [ ] Weekly Teams nudges; manager huddle guide.
- [ ] Mid-pilot pulse survey; fix top issues.
- [ ] Post-assessment, 60-day manager behaviour check, pilot report to the steering group.

### Phase 4: Scale (weeks 22–36)
- [ ] Wave 2 content: Guardian (Control & Governance), Analyst Edge, Floor Ready, Client Advisory.
- [ ] Wave 3 content: Registrar & Probate, Steward (Trustees / Family Office), Deal Room, Credit & Lending, Legacy.
- [ ] Features: branching consequences, cohort challenges, seasonal events (MPC day, AGM season, market-shock week).
- [ ] Group-wide rollout by subsidiary; integrate readiness into talent reviews and MSP assessments (if approved).

### Phase 5: Run and improve (ongoing)
- [ ] Monthly content drop linked to real market and regulatory events.
- [ ] Quarterly regulatory review of all scenarios.
- [ ] Boardroom (executive) track; Enablers track.
- [ ] AI role-play pilot (free-text client conversations graded by rubric).

---

## 3. Team and roles (RACI summary)

| Role | FTE (build) | Responsible for |
|---|---|---|
| Executive sponsor | — | Accountable for outcomes, removes blockers |
| Product owner (L&D) | 1.0 | Backlog, priorities, stakeholder management |
| Instructional / game designer | 1.0 | Mechanics, scenario quality, playtests |
| Content writers | 1–2 | Scenario and quiz authoring |
| Full-stack developers (TypeScript) | 2.0 | Build, integrations, DevOps |
| UI/UX designer | 0.5 | Visual design, accessibility |
| QA / test | 0.5 | Functional, accessibility, UAT |
| SMEs (one per subsidiary) | ~0.1 each | Accuracy review |
| Compliance reviewer | ~0.2 | Conduct and regulatory sign-off |
| IT / InfoSec | ~0.2 | SSO, hosting, security testing |
| HRBPs / line managers | — | Cohorts, manager adoption |

**Build options:** (a) in-house team as above; (b) a local agency for engineering, with L&D owning content; (c) hybrid, where an agency builds the MVP and an in-house developer takes over in Phase 4. The prototype is plain JavaScript and the content is separate from the engine, so any of these works.

---

## 4. Budget drivers (to be costed)
- Engineering effort (Phase 2 is the largest cost).
- Content: about 1–1.5 days of author time plus about 0.5 day of SME/Compliance review per scenario. 120 scenarios in Year 1 is roughly 180–240 person-days.
- Hosting and licences (cloud, LRS, BI). Typically modest at Meristem's headcount.
- Security testing and accessibility audit.
- Launch and engagement (events, prizes, communications).
- Optional: an AI usage budget for the Phase 5 role-play pilot.

---

## 5. Key milestones

| Milestone | Target week |
|---|---|
| Sponsor and steering group confirmed | 2 |
| Prototype playtest report | 6 |
| MVP scope frozen | 6 |
| Security test passed | 15 |
| Pilot launch | 16 |
| Pilot results to steering group | 22 |
| Wave 2 live | 28 |
| Group-wide availability | 36 |

---

## 6. Immediate next steps (this month)
1. Share this PRD, the workplan and the prototype with the HR leadership team.
2. Name the sponsor and the product owner.
3. Book 3 playtest sessions with the prototype.
4. Ask each subsidiary MD to nominate one SME.
5. Open a private GitHub repository and import this folder (see the README).
