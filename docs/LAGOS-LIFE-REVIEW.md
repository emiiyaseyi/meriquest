# Lagos Life: Detailed Review and What It Means for MeriQuest

Draft v0.1, 12 October 2026. A reference review to inform the MeriQuest build.

**How this was researched.** Press coverage (Condia, WeeTracker, Arise TV, BrandSpur), independent fan wikis that log in-game observations, Lagos Life's Terms of Use, and a reading of the game's public front-end code. I did **not** create an account or play signed in. Where a detail comes from the code it is marked *(code)*; from fan guides *(fan)*; from press *(press)*. Fan-guide figures are snapshots and the game changes almost daily.

---

## 1. At a glance

| | |
|---|---|
| **What** | A free, multiplayer, Sims-style life simulation set in Lagos (plus Abuja and Port Harcourt), played in the browser |
| **Who made it** | Nigerian developer Shalom Mathew; operated by *Vatar* (per the Terms) |
| **Launched** | 1 October 2026 (Independence Day) |
| **Build** | First version reportedly built in **under 12 hours with AI tools** *(press)*. Next.js web app, 3D city with a "lighter view" for weak phones, installable from the browser, no app-store listing |
| **Traction** | 1M players in 3 days → 2M+ and 145k concurrent by 5 Oct → **10M+ registrations by 11 Oct** (game-reported) *(press/fan)* |
| **Money** | About US$46.9k revenue in the first 4 days *(press)* from in-game billboards (₦5k/week), Sea Plot ads, artists paying ₦50k for club airplay, Game Naira top-ups via Flutterwave, real-money stadium seats. A $500k angel round has been announced |
| **Age** | 18+ (Terms §2) |

**One-line verdict:** Lagos Life succeeds because it turns *familiar daily life* into a fast, social, low-friction loop with visible progress. Those are exactly the properties workplace learning usually lacks. Its weaknesses (exploits, scams, shallow retention risk, no measurement of learning) are the parts MeriQuest must design better.

---

## 2. How the game is played

### 2.1 Onboarding: "the birth lottery"
- New players get a random, **permanent** start *(code/fan)*:
  - **Nepo Baby** ("Daddy knows people"): a furnished Lekki flat with rent paid, a car, **Branch Manager at Daddy's friend's bank from day one**, ₦500,000 pocket money.
  - **LAPO Baby** ("Self-made hits different"): a ₦60,000 loan (₦72,000 owed, ₦12,000/week), Hustle skill starts at 2, **every skill learned 25% faster**, start in Mushin or Yaba and work up to Lekki.
- Then you pick a city (Lagos / Abuja / Port Harcourt, each with a localised welcome: *"Eko o ni baje 🇳🇬"*) and a starter home, and get a starter pantry (rice, garri, indomie, eggs and so on).
- A skippable tour ("Welcome to Lagos!") points to the Phone, the Map and the needs bars.

**Design insight:** the start is an identity moment. It's funny, shareable on social media, and gives every player a story ("I'm LAPO, I'm grinding"). It also creates two very different difficulty curves.

### 2.2 Needs, mood and wellbeing
- Six needs: **hunger 80, energy 85, hygiene 75, bladder 70, fun 70, social 60** (starting values, *code*). They decay over time.
- Every action has a duration, a cost, and need effects (e.g. *Watch a Comedy Show*: 60 minutes, fun +30). Many attach a **moodlet**, a temporary mood modifier.
- Neglect has consequences: low needs hurt mood and work performance, and players can collapse from exhaustion *(fan)*.
- Mood feeds into success chances at work (see 2.4).

### 2.3 Time
- The game clock is tied to real time *(press)*: a game day roughly follows the real day.
- Jobs have fixed hours and days (e.g. Banking: 8am, 9 hours, Monday–Friday). Players can auto-attend shifts; night work is penalised.

### 2.4 Careers and work (the core of the game)
- **33 starting career routes** across 3 cities *(fan)*, each with **5 levels** and pay per shift *(code)*. Examples:
  - **Banking** (skill: Charisma): Marketer ₦11,600 → Relationship Officer ₦21,000 → Branch Manager ₦31,500 → Executive Director ₦44,600 → MD/CEO ₦72,000. *"Hit your account-opening targets on VI. Charisma is king."*
  - **Tech**: Intern → Junior Dev → Senior Dev → Tech Lead → CTO.
  - **Airport**: Check-in Agent → Security Officer → Ramp Supervisor → Terminal Duty Manager → Airport Manager.
- Some entry roles need a skill level (e.g. House Officer needs Fitness 3). **Promotion** needs 100% performance plus a skill threshold (e.g. *"reach 100% with hustle level 3"*). Thresholds are defined per career, e.g. skill levels 2/4/6/8 *(code/fan)*.
- **Work style each shift** *(code)*: the player picks one of five:
  - 🧑‍💼 *Do Your Work*: steady pace.
  - 🔥 *Work Like Jaguda*: big performance, drains energy and fun.
  - 💬 *Gist with Colleagues*: social up, performance slow.
  - 🙇 *Suck Up to Oga*: charisma helps; risky.
  - 😴 *Take Am Easy*: saves energy; performance drops.
- **Tasks during shifts ("Oga gives you a task")** come in two forms *(code)*:
  1. **Decision cards with probabilistic outcomes.** Example, Banking *"A walk-in customer"*: *Pitch the savings plan* (55% base chance, charisma) / *Upsell a big loan* (30%, big win or "Too pushy", −5 performance) / *Just open the account* (safe, +2). Success chance = base + 5% per skill level + a mood adjustment, clamped to 5–97%. Many tasks offer *"Pass it to {coworker}"* (*"Teamwork 🤝"*).
  2. **63 hands-on mini-games** of 6 types *(code)*:

| Type | Mechanic | Example (career) |
|---|---|---|
| `sortSwipe` | Swipe cards into the right bin | **KYC check** (Banking): *Approve the good forms, reject the funny ones*: "BVN matches, utility bill from last month" ✅ / "Address: Behind the big mango tree" ❌ |
| `holdRelease` | Stop a counter in the target zone | **Count out ₦100,000** (Banking teller) |
| `tapTargets` | Find the right items before the timer runs out | *Spot the fake documents* (Real estate), *Spot the bug in the spec* (Product) |
| `sequence` | Do steps in order; a trap tests judgement | *Fever, headache, stomach pain* (Medicine): take history → examine → order test; trap: "Malaria, as usual" vs "Typhoid" |
| `keepInZone` | Hold a value inside a band under pressure | *Haggle* (Trading): keep the price in the profit zone |
| `timingBar` | Act at the right moment | *Tie up the speedboat* (Ferry) |

- End of shift: a settlement screen shows tasks handled, performance change and pay. Leaving early costs performance and money *(fan)*.

**Design insight:** work is *active and skill-based*, not passive. Outcomes are uncertain but skill improves your odds. Short timed mini-games make procedural knowledge (KYC, counting cash, triage order) feel like play.

### 2.5 Skills and education
- Skills include Hustle, Charisma, Coding, Fitness, Comedy, Music and Cooking (levels up to 10). They improve through practice actions and courses.
- **UNILAG Short Courses** *(code/fan)*: 13 courses (Lawyer, Doctor, Software Developer, **Banker**, Real Estate, Entrepreneur, **Money Smart**, and others). Each course has **5 lessons**. Each lesson is a 45-minute class, then reading notes, then **3 quiz questions**. Lessons unlock in order.
  - **Maximum 2 classes per day:** *"That's 2 classes today. Come back tomorrow"* (built-in spacing).
  - A certificate gives **+15% work performance** in the matching career and a reward boost.
  - *Money Smart* lessons: Budgeting · Saving: emergency funds and ajo · Spot the scam · Borrowing wisely · Making money grow.

**Design insight:** learning is *optional but useful*. It directly improves performance in the career you care about, and the daily cap creates spaced repetition and a reason to come back tomorrow.

### 2.6 Daily missions, streaks and "Lagos Rep"
- **3 daily missions**, one from each tier: *easy*, *city* and *hustle* (e.g. "Work a full shift", "Win 2 tasks at work", "Have 4 conversations", "Level up any skill", "Make ₦20k today") *(code)*.
- Rewards are **claimed** manually (a moment of satisfaction), with a **bonus when all three are claimed**.
- A separate **daily check-in streak**.
- **Lagos Rep levels** are earned through missions and savings; some content is gated by Rep level.
- **Life goals / achievements**, e.g. *Oga at the Top* (top of any career), *Lekki Landlord* (₦1m net worth), *Everybody's Padi* (best friends with 4 people), *Yaba Unicorn* (get your startup funded at CcHub). A rotating set of 3 **wishes** gives short-term goals.
- **Daily gem hunt:** a riddle points to a place; the first finders win the most (₦50k / ₦25k / ₦10k / ₦3k), with a countdown timer *(fan)*.

### 2.7 Social layer (real people)
- Every other character is a **real player**. Chat, groups (with pinning), profiles, stickers.
- **Relationship ladder** *(code)*: Werey (Enemy) → Stranger → Acquaintance → Padi → Paddy Mi (best friend), plus "Bae".
- Players can **send money**, give to charity ("Give"), and post or take jobs from each other on the **Hustle board** and **HANDI** job board.
- **Games hub**: Pool, Ayo, Whot, Ludo.

### 2.8 Economy and consequences
- **Game Naira**: no real-world value, can't be cashed out (Terms §5).
- Weekly rent, food, transport, furniture, a car with fuel, repairs (via HANDI), health (General Hospital ₦8,000, chemist delivery).
- **Naija Reserve Bank**: savings 0.5%/week, bonds 2% in 7 days. Loans, taxes and insurance.
- **Crime and justice**: crimes with catch chance and fines; Police, EFCC raids, a live **Court** with player lawyers; jail with time off for good behaviour.
- **Random events**: Area Boys (charisma check, ₦400 lost), "Nature is calling" during shifts, **NEPA power cuts** (generators and solar as counters).

### 2.9 Civic layer
- A weekly **Governor election** (₦50,000 to run, ₦25,000 daily allowance) plus Senator and President.
- The winner sets **policies** that change the economy for everyone, e.g. *Food subsidy* (food 30% cheaper) or *Steady light* (NEPA cuts shorter and rarer).

### 2.10 Live operations
- Near-daily updates: new cities (Abuja, Port Harcourt), the airport and intercity travel, HANDI HQ, Heala (health partner), stadium live football, Court fixes, a lighter 3D view.
- **Real brand partnerships** inside the world (HANDI, Heala, music artists, billboards).
- A public **live stats page** (players online, total players, visits) that refreshes every 30 seconds, used as social proof.

---

## 3. Why it works: principles to borrow

| # | Principle | How Lagos Life does it | MeriQuest translation |
|---|---|---|---|
| 1 | **Familiarity and humour** | Real places, slang, NEPA, danfo, "Oga", "Jaguda" | Real Meristem places (Gerrard Road HQ, the trading floor, the Registrar desk), real products (Meritrade, WealthBuddy), Meristem in-jokes and CEPOEM language, written with Corporate Comms |
| 2 | **Zero friction** | A link, no download, works on cheap phones | Teams/intranet link, SSO, PWA, lightweight 2D, under 300 KB first load |
| 3 | **Short, active loops** | 1-hour shifts, mini-games, instant feedback | 5–10 minute sessions; mini-games for procedures (KYC, T-bill pricing, phishing spotting) |
| 4 | **Visible ladders** | Five named levels per career with pay | Real Meristem career ladders (Intern → Officer → Senior → Team Lead → Head → MD), with competencies needed for each step |
| 5 | **Skill improves the odds** | Chance + 5%/skill level + mood | Hidden or visible competency score raises the chance of good outcomes; learning pays off in-game |
| 6 | **Agency, no fixed story** | Choose your work style, spend, study, socialise | Choose which scenarios, courses or mentoring to pursue; work-style choice per day |
| 7 | **Meaningful constraints** | Needs, rent, energy, time | Energy and wellbeing, time slots, client trust, compliance standing |
| 8 | **Learning with a reason** | Courses give +15% performance in the matching career | Micro-courses unlock better odds or new scenario branches in your track |
| 9 | **Spacing built in** | Max 2 classes per day | Daily caps on lessons and scenarios → spaced practice |
| 10 | **Daily habit** | 3 tiered missions, claim + bonus, check-in streak, gem hunt | Same structure, themed to work |
| 11 | **Social proof and belonging** | Real players, live counters, relationships | Cohorts, team challenges, "colleagues online", peer kudos |
| 12 | **Collective stakes** | Governor policies affect everyone | Team or Group "town hall" votes on weekly themes; a CEO challenge week |
| 13 | **Identity moment** | Nepo/LAPO lottery | A role-based start card ("You are a Wealth Advisory Intern…") with a shareable avatar badge. Not random privilege |
| 14 | **Live ops** | Daily drops, real events (football) | A monthly content drop tied to real events: MPC decisions, AGM season, results season, regulatory changes |

---

## 4. What NOT to copy

| Lagos Life element | Why it's wrong for MeriQuest | Alternative |
|---|---|---|
| Random **Nepo/LAPO privilege** | Random advantage feels unfair at work and touches on equity concerns | Role- and level-based starts; optional "challenge modes" chosen by the player |
| **Crime, EFCC raids, casino, jail** | Inappropriate for a regulated financial firm | Conduct scenarios where *misconduct has consequences* (disciplinary hearing, regulatory sanction), framed as learning |
| **Real-money purchases, ads, top-ups** | No monetisation in an internal tool; perceived pay-to-win | No real money. Rewards are recognition (badges, certificates, CEO shout-outs), never pay |
| **Anonymous chat and money transfers** | Harassment, scam, data-leak and records risk (Lagos Life already has strangers begging for money) | Multiplayer with **real-name SSO identities**, moderated chat, report/block, and **no transferable currency** (see §7.1) |
| **Bladder/hygiene-style needs** | Trivial for professionals; can feel infantilising | A single **Energy/Wellbeing** meter plus focus and stress |
| **Real-time clock** | Clashes with real work hours; penalises staff on leave | Session-based "days" (4 slots) that advance when the player chooses |
| **Exploitable economy** | Lagos Life had a money exploit within days and had to reset balances | Server-authoritative scoring; no transferable currency; anti-gaming checks |
| **Luck-only outcomes** | Feel unfair when assessed | Keep chance for flavour, but **assessment uses the decision quality**, not the dice roll |
| **18+ consumer Terms, device fingerprinting** | Wrong legal frame for employees | Employee data notice, DPIA, NDPA-aligned retention, no fingerprinting |

---

## 5. Gap analysis: prototype v0.1 vs. Lagos Life-grade experience

| Area | Lagos Life | MeriQuest prototype v0.1 | Gap → build item |
|---|---|---|---|
| Start / identity | Birth lottery, city, home, avatar | Name, emoji avatar, choose track | **Role start card** with a shareable badge; richer avatar (attire, branch office) |
| World | 3D city, 3 cities, ~40 venues, travel | Grid of 13 location cards | **2D illustrated Group map** (HQ, branches in Lagos, Abuja and Port Harcourt, client sites); travel costs a time slot |
| Time | Real-time clock, shifts | 4 slots per day, End Day | Keep slots; add a **work-style choice** per day (focus / collaborate / network / recharge) |
| Needs | 6 needs + moodlets | Energy only | Add **Focus/Stress** and temporary moodlets (e.g. "Praised by MD: +10% for today") |
| Careers | 33 routes × 5 levels, skill-gated promotions | 4 tracks, readiness review at the end | **Explicit 5-level ladders per subsidiary**, promotion panels gated by competency thresholds |
| Work tasks | Decision cards + 63 mini-games of 6 types | Decision cards only (3 options) | Build the **6 mini-game types** for procedures: KYC sort-swipe, T-bill price "hold-release", phishing "tap targets", trade settlement "sequence", suitability "keep-in-zone" |
| Outcome model | Probabilistic, skill and mood modified | Deterministic ratings | Add a **chance layer for outcomes** while scoring decision quality separately |
| Delegation | "Pass it to a coworker" | — | Add **delegate/escalate** options to scenarios (vital for the team-lead track) |
| Education | 13 courses × 5 lessons + 3-question quizzes, 2/day cap, cert = +15% | 3-question daily quiz | **Micro-courses** (e.g. "CIS Exam Prep", "AML Essentials", "Coaching with GROW"): 5 lessons, notes + quiz, 2/day cap, certificate boosts the relevant odds |
| Missions | 3 tiered missions, claim + all-claimed bonus, check-in streak | 3 fixed missions, auto-claimed, streak | **Tiered, randomised missions** with manual claim and a separate check-in streak |
| Goals | Life goals + 3 rotating wishes | Readiness review only | **Career aspirations** (e.g. "Become Head of Advisory", "Mentor 3 interns", "Earn all 6 CEPOEM badges") + rotating weekly goals |
| Social | Real players, chat, relationships, money transfer | None | **Colleague NPC relationships** (Stranger → Colleague → Ally → Mentor) and **real cohort features** (team challenges, kudos) |
| Civic / collective | Governor elections and policies | None | **Town-hall vote** each month (the cohort picks a theme, e.g. "Cyber Security Month" doubles XP on infosec scenarios) |
| Events | NEPA, random street events, gem hunt | None | **Random workplace events** (system outage, surprise audit, market shock), a weekly **"Treasure hunt" riddle** about Group products |
| Economy | Game Naira, bank, rent, loans | XP only | **Merit points** (non-transferable) to unlock cosmetic office items and courses; no transfers |
| Live ops | Daily updates, partnerships, live football | Static content file | **Admin CMS**, a monthly content calendar, seasonal events |
| Stats / social proof | Public live stats page | Local report only | **Internal leaderboard of cohorts/teams**, "colleagues online now" |
| Measurement | None for learning | Competency deltas, xAPI export | **Manager dashboard, pre/post tests, LRS**: our advantage, keep it |
| Governance | Terms of Use | Disclaimer | Employee notice, DPIA, content sign-off workflow |

---

## 6. Recommended MeriQuest feature backlog (informed by this review)

### MVP (must have for the pilot)
1. SSO, server saves, role-based start card, 4 Wave 1 tracks expanded to 10–12 scenarios each.
2. **Decision cards** with best / partly right / risky choices, the coach's note, **delegate/escalate** options and a chance layer for flavour.
3. **Three mini-game types** first: `sortSwipe` (KYC, AML red flags, phishing), `sequence` (account opening, trade settlement, complaint handling), `tapTargets` (spot the error in a statement or research note).
4. **Micro-courses**: 5 lessons × (notes + 3 questions), 2/day cap, certificate → +15% odds on related scenarios.
5. **Daily missions** (easy / work / growth tiers), manual claim, all-claimed bonus, check-in streak.
6. Energy + focus meters, daily work-style choice.
7. Career ladders with competency-gated promotion panels.
8. Manager dashboard, xAPI to the LRS, pre/post assessments.
9. **2D illustrated Group map** with avatars and travel between locations.
10. **Multiplayer foundation:** real-time presence on the map, profiles, team/cohort/location chat and DMs with moderation (filter, report, block, moderator console), kudos.

### v1.1 (pilot feedback release)
11. Remaining mini-game types (`holdRelease`, `keepInZone`, `timingBar`).
12. **Co-op scenarios** (2–4 players in roles) and **mentoring sessions** hosted by senior players.
13. Colleague relationship ladder (Stranger → Colleague → Ally → Mentor); recurring NPCs that remember your past choices.
14. Team/cohort challenges and leaderboards; weekly riddle hunt on Group products; random workplace events.

### Later
15. Monthly town-hall vote and seasonal events (MPC day, AGM season, Cyber Month).
16. Branches in Abuja and Port Harcourt as additional map areas.
17. Cosmetic office customisation with Merit points.
18. AI role-play (free-text client conversations graded by a rubric).

---

## 7. Decisions

### Made (12 October 2026)
| Decision | Choice | What it means for the build |
|---|---|---|
| Social scope | **Full multiplayer world** | Staff see colleagues on the shared map in real time, chat, form relationships and play together. Adds real-time infrastructure, moderation tooling and an HR conduct policy to the MVP (see 7.1) |
| Time model | **Session-based days** | Each player has their own 4-slot day; the *shared world* shows who is online and where, but nobody is penalised for being away |
| Visual style | **2D illustrated map** | Commission an illustrator for the Group map (HQ, branches, client sites) and character art; keeps phones and data costs light |
| Use of data | **Development only** | Results feed IDPs and coaching; never ratings, pay or MSP pass/fail. State this in the employee notice |

### 7.1 Multiplayer: how to do it safely at work
Lagos Life shows both the pull of a shared world and the risks of one (strangers asking for money, exploits, moderation load). MeriQuest's version:

| Feature | Include | Guardrails |
|---|---|---|
| **Presence** | Colleagues' avatars on the map; "who's at the Trading Floor now"; online count by subsidiary | Players can go "invisible"; no location tracking outside the game |
| **Profiles** | Name, role, subsidiary, level, CEPOEM badges, certificates | Driven by HRIS data; no personal photos in v1 |
| **Chat** | Team, cohort and location channels; 1:1 DMs between colleagues | Real names only (SSO), a profanity/PII filter, report and block, retention under the HR records policy, moderators from HR/L&D, an acceptable-use policy |
| **Relationships** | Colleague ladder: Stranger → Colleague → Ally → Mentor, earned through co-op play and kudos | No "enemy" or romance tiers |
| **Co-op scenarios** | Two to four players take roles in one scenario (e.g. team lead + junior advisor + client; dealer + compliance officer) | Facilitated by game rules; scored per role |
| **Mentoring** | Senior players "host" juniors at their location for a coaching scenario; both earn | Natural fit for the Canopy and Legacy tracks |
| **Kudos** | Give a colleague a CEPOEM kudos (limited per week) | Visible to the receiver and their manager |
| **Collective events** | Monthly town-hall vote on a theme; Group-wide challenges | Themes are pre-approved by L&D |
| **No** | Transferable currency, gifts of points, open public posting, anonymous accounts | Removes Lagos Life's scam and exploit vectors |

### Still open
1. **Chance in outcomes:** allow luck in *outcomes* while *assessment* stays on decision quality (recommended)?
2. **Recognition:** are non-monetary rewards (certificates, CEO shout-outs, badges on profiles) acceptable to HR?
3. **Mandatory or voluntary:** which tracks are assigned (induction, compliance) and which are opt-in?
4. **Chat moderators:** who in HR/L&D moderates, and what are the response times?

---

## Sources
- [Condia: How the Nigerian life simulator Lagos Life game works](https://thecondia.com/lagos-life-game/)
- [Condia: This Nigerian developer built a game that hit 1M users in three days](https://thecondia.com/shalom-mathew-lagos-life)
- [WeeTracker: Viral simulator games on browser tabs make a splash in Nigeria](https://weetracker.com/?p=91086)
- [Arise TV: How Lagos Life is capturing young Nigerians online](https://www.arise.tv/how-lagos-life-is-capturing-young-nigerians-online/)
- [BrandSpur: Nigerian-made Lagos Life game attracts over 1 million players](https://brandspurng.com/2026/10/08/nigerian-made-lagos-life-game-attracts-over-1-million-players-after-launch/)
- Fan guides (unofficial): [How to play](https://lagoslife.org/how-to-play/) · [Jobs](https://lagoslife.org/jobs/) · [Nepo vs Lapo](https://lagoslife.org/nepo-vs-lapo/) · [Money](https://lagoslife.org/money/) · [Courses](https://lagoslife.org/courses/) · [Daily hunt](https://lagoslife.org/daily-hunt/) · [Updates](https://lagoslife.org/updates/)
- [Lagos Life Terms of Use](https://lagoslife.app/terms)
- Lagos Life public front-end code at [lagoslife.app](https://lagoslife.app/) (read 12 Oct 2026)
