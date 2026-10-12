# MeriQuest: Client Simulation, Office Segments and Performance

Draft v0.1, 12 October 2026.
**Pilot scope:** Customer Experience (CX), Wealth Advisory and Investment Advisory.
Prototype files: [`game/clients.js`](../game/clients.js) (segments, personalities, signature clients) · [`game/clientgen.js`](../game/clientgen.js) (client generator) · [`game/engine.js`](../game/engine.js) (Client Lounge and Client Desk).

---

## 1. Why this matters

Front-office staff handle **10+ client contacts a day** across calls, SMS, email, WhatsApp, chatbot hand-offs, walk-ins and social media. Clients come from every part of Nigeria, the diaspora and abroad. Performance depends on three things at once:
1. **Doing the right thing:** process, product and compliance (the *substance*).
2. **Doing it the right way for this person:** reading personality, mood and context (the *tone*).
3. **Doing it at volume, on time:** prioritising a queue and meeting response targets (the *pace*).

MeriQuest trains all three, safely, before they're tested on real clients.

---

## 2. The three office categories

| | 🤝 Front Office | ⚖️ Middle Office | ⚙️ Back Office |
|---|---|---|---|
| **Skill mix** | 70% sales & client · 30% technical & support | 50% sales & client · 50% technical | 70% supporting front & middle · 30% driving unit growth |
| **Pilot roles** | **CX team, Wealth Advisory** | **Investment Advisory** | (post-pilot) |
| **Other roles** | Relationship managers, business development, Family Office relationship staff | Research, portfolio management, IB analysts, credit analysts, trust officers | Operations & settlement, Registrar processing, Finance, IT, HR, Compliance/ICU/Audit/Risk |
| **Main sim type** | External clients: sales, service, complaints | External clients: advice, analysis, explanation | **Internal clients** (front/middle colleagues) + process-improvement challenges |

### 2.1 Performance index (0–100)
Each player gets a single **Performance Index**, weighted to their office:

| Competency | Front | Middle | Back |
|---|---|---|---|
| Sales & Business Growth | **30** | 15 | 10 |
| Client Communication | **25** | 15 | 5 |
| Service Excellence | 10 | 10 | **25** |
| Ownership & Problem-solving | 5 | – | 15 |
| Collaboration | 5 | 10 | 15 |
| Markets & Products | 10 | **15** | 5 |
| Analysis & Valuation | 5 | **15** | 5 |
| Portfolio & Risk | 5 | **15** | – |
| Tools, Systems & Operations | 5 | 5 | **20** |
| **Total** | 100 | 100 | 100 |

- **Conduct is a gate, not a trade-off.** Regulation & Compliance and Ethics aren't weighted. Instead, a Compliance Standing below 50 **caps the index at 80%** of its value. You can't sell your way past a breach.
- **Leadership tracks** (e.g. team leads) blend in 25% Leadership & Coaching.
- These weights are a draft for HR and the business heads to calibrate.

---

## 3. The client personality model

Every client, hand-written or generated, is a combination of:

| Dimension | Values | What it changes |
|---|---|---|
| **Personality style** (Social Styles) | ⚡ Driver · 🔍 Analytical · 🤗 Amiable · 🎉 Expressive | How each *tone* of response lands (see 3.1) |
| **Mood** | Calm · Anxious · Irritated · Angry | Starting trust, complexity |
| **Tier** | Retail · Affluent · HNI/VIP · Corporate | Amounts at stake, complexity, priority in the queue |
| **Channel** | 📞 Call · 💬 WhatsApp · ✉️ SMS · 📧 Email · 🤖 Chatbot hand-off · 🚶🏾 Walk-in · 📣 Social media | Response-time target, handling time, rules (e.g. no OTPs in chat; public replies on social media) |
| **Location** | 24 Nigerian cities in all 6 regions + FCT · 8 diaspora cities (UK, USA, Canada, UAE, South Africa, Ghana) · 7 international cities (UK, USA, France, Ghana, Kenya, India, China) | Names, honorifics, time zone, currency (USD abroad), non-resident KYC, CCI/repatriation for foreign investors, no walk-ins from abroad |
| **Case** | 23 case types across CX, Wealth and Investment Advisory | The *substance*: correct process, hidden needs, compliance traps, growth opportunity |
| **Complexity** | ★ to ★★★★★ | Derived from case difficulty + tier + mood + channel + location |

### 3.1 Same words, different clients
Each tone option carries an approach (*brief, data, question, empathy, rapport, reassure, story, pressure*). The client's style changes how it lands:

| Approach | ⚡ Driver | 🔍 Analytical | 🤗 Amiable | 🎉 Expressive |
|---|---|---|---|---|
| Brief / bottom line | **++** | 0 | − | − |
| Data and detail | + | **++** | − | −− |
| Probing question | + | **++** | + | + |
| Empathy | 0 | 0 | **++** | + |
| Rapport / warmth | − | − | **++** | + |
| Reassurance | − | 0 | **++** | 0 |
| Story / enthusiasm | − | −− | + | **++** |
| Pressure | 0 | −− | −−− | − |

**Cues** tell the player who they're dealing with, the way real clients do. "Short and direct, skips greetings" suggests a Driver. "Apologises for disturbing you" suggests an Amiable. "Lots of emojis!!" suggests an Expressive. "Quotes figures and reference numbers" suggests an Analytical.

---

## 4. Getting enough clients: the generator

Hand-writing clients doesn't scale to 10+ contacts a day for every staff member. The **client generator** builds a new client every time from building blocks:

```
case (23) × personality (4) × mood (4) × tier (4) × channel (7) × location (39 cities) × names (Yoruba, Igbo, Hausa, South-South, international)
≈ 400,000+ distinct combinations before names and amounts
```

In testing, **1,000 generated clients produced 1,000 unique combinations** covering all 23 cases and 7 channels. About 76% were in Nigeria, 15% in the diaspora and 9% international (tunable).

**Realism rules built in:**
- Cases only appear on channels where they'd really happen (no viral-tweet case by email; no walk-ins from Houston).
- Case ↔ tier fit (a "how do I start investing?" client is retail; corporate treasury cases are corporate).
- Region-appropriate names and honorifics (Alhaji/Hajia/Mallam in the North; Chief/Lady elsewhere).
- Diaspora and international clients talk in US dollars, see time-zone differences and face non-resident KYC.
- Foreign investors need a CCI and get FX-repatriation questions.

### 4.1 Case library (prototype)
| Unit | Cases |
|---|---|
| **CX** | Statement request · Can't log in to WealthBuddy · Dividends not received · Change of phone number (takeover risk) · Delayed redemption · Unexpected charge · Fake "Meristem" caller asking for OTP · Viral public complaint · Deceased client's account · Stuck in the chatbot loop |
| **Wealth Advisory** | How do I start investing? · T-bill maturing · Breaking a locked plan · "I want 30%, guaranteed" (Ponzi risk) · Diaspora dollar investment · HNI succession worries |
| **Investment Advisory** | "Should I buy this stock now?" · "My portfolio is underperforming" · Rate hike and my bonds · Margin call · "My brother says results are great" (insider risk) · Foreign investor: Nigerian equities (CCI) · Corporate cash placement |

Every case has: the client's opening message, **hidden needs** to uncover, 1–2 decisions with a best, a partly-right and a wrong option, **compliance traps**, and an optional **growth** opportunity (a cross-sell for front and middle office; a process improvement for back office).

### 4.2 Scaling the library
1. **From Meristem's real cases (next step).** Each anonymised CX case you share becomes a new case template, and is then multiplied across every personality, mood, tier, channel and location automatically. **10 real cases → tens of thousands of practice clients.** See the [case template](templates/CLIENT-CASE-TEMPLATE.md).
2. **From contact-centre data.** Feed real channel mix, case frequencies, peak hours and response-time targets (aggregated, no personal data) so a MeriQuest shift *feels like* a real Meristem shift.
3. **AI-generated clients (later phase).** An LLM writes new client messages and free-text replies within the case rules, and grades the player's own words against a rubric (accuracy, compliance, tone fit). Guardrails: case templates approved by Compliance, no real client data in prompts, and human review of new case types.

---

## 5. Three ways to practise

| Mode | What it is | Best for | Status |
|---|---|---|---|
| 🛋️ **Signature clients** | Hand-crafted, deep 5-step conversations with a personality-reading step (e.g. Alhaji Danjuma, a Driver HNI; Mrs Eze, an Amiable CX complaint; Dr Okeke, an Analytical prospect; Kunle, an Expressive internal client) | Learning the model; coaching sessions | ✅ Prototype |
| 🎧 **Client Desk shift** | 6, 10 or 14 generated contacts arriving over a shift; prioritise the queue; meet response targets; Starter / Standard / Expert difficulty; filter by team | Volume practice; daily habit; CX KPIs | ✅ Prototype |
| 🎭 **Live role-play** (multiplayer) | One colleague plays the client from a persona card, another serves them; a third observes and scores | Team meetings, onboarding, coaching | Planned (multiplayer phase) |
| 🤖 **AI client** | Free-text conversations with an AI client, graded by rubric | Advanced practice | Planned (later phase) |

---

## 6. Scoring: game KPIs that mirror real KPIs

| Per contact | Per shift (scorecard) | Real-world equivalent |
|---|---|---|
| Resolved first time / partly / unresolved | **First-contact resolution (FCR) %** | FCR |
| Trust → satisfaction ★1–5 | **Average satisfaction** | CSAT / NPS |
| Waited vs. channel target | **Response target met %** | SLA compliance |
| Steps × channel time | **Average handling time** | AHT |
| Tone choices that suited the personality | **Tone fit %** | Quality-assurance "soft skills" score |
| Conduct breaches | **Breaches** | QA compliance fails, complaints |
| Value won or retained; cross-sells / improvements | **Value · growth count** | AUM inflow, retention, cross-sell ratio |
| — | **Abandoned contacts** | Abandonment rate |

**Balance check (automated play testing, 3 shifts each):**

| Player behaviour | FCR | Satisfaction | Breaches |
|---|---|---|---|
| Expert (right process + right tone for the personality) | 70–90% | ~3.8 / 5 | 0 |
| Process only (right process, ignores personality) | ~80% | ~3.2 / 5 | 0 |
| Random | 20–30% | ~2.5 / 5 | 1–3 per shift |

Reading the client measurably pays off, and cutting corners shows up as breaches.

---

## 7. How this drives employee performance
1. **Practice volume.** Hundreds of realistic contacts a month at no cost or risk to clients.
2. **Immediate, specific feedback.** Each contact shows the client's personality, hidden needs and the best-practice path.
3. **KPIs people recognise.** The same language as their real scorecards (FCR, CSAT, SLA, AHT, cross-sell), so improvement transfers.
4. **Daily habit.** One Desk shift counts towards daily missions and streaks.
5. **Team leagues (multiplayer).** Weekly team challenges on FCR and satisfaction; recognition, not pay (results are development-only).
6. **Manager coaching prompts.** e.g. "Ada's tone fit with Analytical clients is 30%: practise data-led openings."
7. **Correlation, not judgement.** Over time, L&D can compare game KPIs with real CX KPIs *in aggregate* to show the programme's impact.

---

## 8. Sharing your CX cases
Use [templates/CLIENT-CASE-TEMPLATE.md](templates/CLIENT-CASE-TEMPLATE.md). Before sharing:
- **Anonymise everything:** no real names, account numbers, BVN/NIN, phone numbers, emails, addresses or exact balances. Round amounts and change details. (NDPA 2023)
- Describe the *pattern*: what the client wanted, what went well or badly, and what the right handling is per Meristem policy.
- Mark any compliance or regulatory point so Compliance can confirm the "best" answer.

---

## 9. Open questions
1. Real response-time and handling-time targets per channel for CX, Wealth and Investment Advisory?
2. Current CX KPIs and their targets (FCR, CSAT/NPS, SLA, AHT)?
3. Channel mix and top 20 contact reasons (from the CRM or contact-centre reports)?
4. Is there a QA scorecard for calls and chats that MeriQuest should mirror?
5. Which CRM is used, and could anonymised, aggregated volumes be exported to calibrate shifts?
