/*
 * MeriQuest — client personality sims + office segments (DRAFT content pack)
 *
 * Personality model: the four Social Styles (Driver, Analytical, Amiable, Expressive).
 * The SAME response lands differently with different clients: every option has an
 * approach `tag`, and the client's style adds a trust modifier for that tag.
 *
 * Option fields: label, tag, trust (base), compliance, reveals (need id), growth (true =
 * cross-sell for front/middle office, process improvement for back office), reply.
 */
Object.assign(window.MERIQUEST_CONTENT, {
  /* ---------- Three office categories ---------- */
  segments: [
    {
      id: "front", emoji: "🤝", name: "Front Office",
      mix: "70% sales & client · 30% technical & support",
      blurb: "Win, grow and keep clients: advisors, relationship managers, CX, business development.",
      roles: ["Wealth / Client Advisory Officers", "Relationship Managers", "Client Experience (CX) team", "Business development across subsidiaries", "Family Office relationship staff"],
      weights: { sales: 30, comm: 25, svc: 10, own: 5, mkt: 10, risk: 5, ana: 5, ops: 5, team: 5 },
      pillars: [["Sales & client", ["sales", "comm", "svc", "own"]], ["Technical & support", ["mkt", "risk", "ana", "ops", "team"]]],
    },
    {
      id: "middle", emoji: "⚖️", name: "Middle Office",
      mix: "50% sales & client · 50% technical",
      blurb: "Technical experts who also face clients: investment advisory, research, portfolio, IB, credit, trust officers.",
      roles: ["Investment Advisory Officers", "Research Analysts", "Fixed Income & Portfolio Managers", "Investment Banking Analysts (Capital)", "Credit Analysts (Finance)", "Trust & Estate Officers"],
      weights: { sales: 15, comm: 15, svc: 10, team: 10, mkt: 15, ana: 15, risk: 15, ops: 5 },
      pillars: [["Sales & client", ["sales", "comm", "svc", "team"]], ["Technical", ["mkt", "ana", "risk", "ops"]]],
    },
    {
      id: "back", emoji: "⚙️", name: "Back Office",
      mix: "70% supporting front & middle · 30% driving unit growth",
      blurb: "Keep the engine running and improve it: operations, settlement, registrar processing, finance, IT, HR, control functions.",
      roles: ["Operations & Settlement", "Registrar processing", "Finance & Accounts", "IT & Information Security", "HR & Admin", "Compliance, ICU, Audit, Risk"],
      weights: { svc: 25, ops: 20, team: 15, comm: 5, ana: 5, own: 15, sales: 10, mkt: 5 },
      pillars: [["Support & service", ["svc", "ops", "team", "comm", "ana"]], ["Unit growth", ["own", "sales", "mkt"]]],
    },
  ],

  /* Leadership tracks blend 25% leadership into the segment score */
  leaderOverlay: 0.25,

  /* ---------- Social Styles: how each client reacts to each approach ---------- */
  styles: {
    driver: {
      name: "Driver", emoji: "⚡",
      reads: "Direct, fast, results-first. Checks the time. Short sentences.",
      wants: "The bottom line, options, respect for their time.",
      avoid: "Small talk, long lectures, indecision.",
      mods: { brief: 4, question: 1, data: 1, rapport: -2, story: -1, reassure: -1, empathy: 0, pressure: 0 },
    },
    analytical: {
      name: "Analytical", emoji: "🔍",
      reads: "Precise, cautious, asks 'how' and 'why'. Has done their homework.",
      wants: "Facts, detail, process, time to decide.",
      avoid: "Pressure, vague claims, anecdotes instead of evidence.",
      mods: { data: 4, question: 3, brief: 0, rapport: -1, story: -2, reassure: 0, empathy: 0, pressure: -4 },
    },
    amiable: {
      name: "Amiable", emoji: "🤗",
      reads: "Warm, relationship-focused, worried about people and security.",
      wants: "Empathy, reassurance, a personal point of contact, follow-through.",
      avoid: "Coldness, conflict, being rushed or passed around.",
      mods: { empathy: 3, rapport: 3, reassure: 4, question: 1, story: 1, data: -1, brief: -2, pressure: -5 },
    },
    expressive: {
      name: "Expressive", emoji: "🎉",
      reads: "Energetic, persuasive, big-picture, loves recognition.",
      wants: "Enthusiasm, stories, quick wins, being seen.",
      avoid: "Dry detail, flat 'no's, bureaucracy without a way forward.",
      mods: { story: 4, rapport: 2, empathy: 1, question: 1, brief: -1, reassure: 0, data: -2, pressure: -1 },
    },
  },

  /* ---------- Client personas ---------- */
  clientSims: [
    {
      id: "danjuma", pilot: true, segment: "front", kind: "Sales: new HNI prospect", style: "driver",
      emoji: "👳🏾‍♂️", name: "Alhaji Musa Danjuma", profile: "58 · Owner, logistics company · walk-in at the Wealth Lounge",
      value: 150000000, valueLabel: "AUM", growthLabel: "Cross-sell to Meristem Trustees",
      cues: ["Checks his watch twice before sitting down", "Opens with: \"I don't have much time.\"", "Short sentences; wants the bottom line"],
      needs: [{ id: "liquidity", label: "Needs ₦50m back within 3 months for new trucks" }, { id: "succession", label: "Wants his family protected if anything happens to him" }],
      startTrust: 40,
      stages: [
        { client: "I have 15 minutes. My bank pays me almost nothing on ₦150 million. What can Meristem do?",
          options: [
            { label: "\"Understood, sir. Three quick questions, then two options before your 15 minutes are up.\"", tag: "brief", trust: 3, reply: "Good. Go." },
            { label: "\"Welcome, sir! How was the traffic? Can I get you some tea while we get to know each other?\"", tag: "rapport", trust: 1, reply: "The traffic was fine. My time is not." },
            { label: "\"Our equity fund returned over 40% last year. Move everything now.\"", tag: "pressure", trust: -2, compliance: -5, reply: "Last year is last year. You don't even know what I need." },
          ] },
        { client: "Ask your questions.",
          options: [
            { label: "\"When might you need part of this money back, and how much?\"", tag: "question", trust: 2, reveals: "liquidity", reply: "About ₦50 million in three months. New trucks." },
            { label: "\"Let me first walk you through our twelve fund factsheets.\"", tag: "data", trust: -3, reply: "Twelve? Summarise." },
            { label: "\"On a scale of 1 to 10, what's your risk appetite?\"", tag: "question", trust: 0, reply: "Five. Next." },
          ] },
        { client: "What else?",
          options: [
            { label: "\"Beyond returns, what do you want this money to do for your family and the business?\"", tag: "question", trust: 2, reveals: "succession", reply: "My children. I want things sorted if anything happens to me." },
            { label: "\"Would you like to hear about our loyalty rewards?\"", tag: "rapport", trust: -1, reply: "No." },
            { label: "\"So, shall I open the account right now?\"", tag: "pressure", trust: -2, reply: "You haven't told me anything yet." },
          ] },
        { client: "So what do you recommend?",
          options: [
            { label: "\"Two buckets: ₦50m in the money-market fund for the trucks, available within days. ₦100m in a diversified fixed-income and equity mix for growth. Returns aren't guaranteed; here's the one-page fact sheet with fees.\"", tag: "brief", trust: 3, compliance: 5, reply: "Clear. I like that." },
            { label: "\"Put it all in our fixed income. I can guarantee you 25% a year.\"", tag: "pressure", trust: 1, compliance: -20, reply: "Guaranteed? Hmm." },
            { label: "\"Here's a 20-page proposal with scenario analysis. Let's go through it page by page.\"", tag: "data", trust: -2, reply: "Send it. I'll read it. Maybe." },
          ] },
        { client: "Your fees are higher than my bank's. Why should I bother?",
          options: [
            { label: "\"After fees, the money-market bucket alone beats what you earn today, and you keep access. For your children, our sister company Meristem Trustees can set up a trust. Shall I book both for Thursday?\"", tag: "brief", trust: 3, growth: true, needsFor: "succession", reply: "Thursday, 10am. Bring the paperwork." },
            { label: "\"This rate closes today, sir. Sign now or lose it.\"", tag: "pressure", trust: -3, compliance: -5, reply: "I don't like being rushed." },
            { label: "\"Please take all the time you need. We can talk again next month.\"", tag: "reassure", trust: 0, reply: "Fine. Call me next month." },
          ] },
      ],
      outcomes: {
        closed: "Alhaji signs on Thursday: ₦150m in two buckets, and a trust-planning session booked with Meristem Trustees.",
        partial: "He moves ₦50m \"to test you\" and promises to review the rest in three months.",
        lost: "He thanks you politely and leaves. His driver is already starting the car.",
      },
    },
    {
      id: "eze", pilot: true, segment: "front", kind: "CX: complaint and service recovery", style: "amiable",
      emoji: "👵🏾", name: "Mrs Grace Eze", profile: "66 · Retired matron · client for 12 years · phone call",
      value: 38000000, valueLabel: "Portfolio retained", growthLabel: "Self-service + emergency reserve",
      cues: ["Voice shaking; calls you \"my son / my daughter\"", "Mentions she has been a client for 12 years", "Worried about her family more than about returns"],
      needs: [{ id: "deadline", label: "Grandson's school fees are due on Friday" }, { id: "confidence", label: "Afraid she'll lose her life savings" }],
      startTrust: 35,
      stages: [
        { client: "Hello? I asked for ₦2 million five days ago and nobody has called me. Is my money safe?",
          options: [
            { label: "\"Good afternoon, Ma. I'm so sorry for the worry this has caused you. Your money is safe, and I'll personally stay on this with you.\"", tag: "empathy", trust: 3, reply: "Thank you. I've been so worried." },
            { label: "\"Please give me your account number.\"", tag: "brief", trust: 0, reply: "…Okay. Here it is." },
            { label: "\"Ma, redemptions take time. It's in our terms and conditions.\"", tag: "pressure", trust: -2, reply: "Terms and conditions? I've been your customer for twelve years!" },
          ] },
        { client: "I just want my money.",
          options: [
            { label: "\"Of course. May I ask what the money is for, so I understand how urgent this is?\"", tag: "question", trust: 2, reveals: "deadline", reply: "My grandson's school fees. The deadline is Friday." },
            { label: "\"The system shows 'processing'. That's all I can see.\"", tag: "brief", trust: -1, reply: "Processing for five days?" },
            { label: "\"Many clients have this issue, Ma. You're not alone.\"", tag: "story", trust: -2, reply: "That doesn't help me." },
          ] },
        { client: "Will this happen again?",
          options: [
            { label: "\"It sounds like this has really shaken your confidence. What worries you most right now?\"", tag: "empathy", trust: 1, reveals: "confidence", reply: "That I'll lose my savings. It's all I have." },
            { label: "\"It will never happen again. I promise.\"", tag: "reassure", trust: 0, compliance: -5, reply: "You promise?" },
            { label: "\"I'll log a ticket.\"", tag: "brief", trust: -1, reply: "A ticket…" },
          ] },
        { client: "So what will you do?",
          options: [
            { label: "\"I've escalated it to Operations as urgent, with your Friday deadline. I'll call you back by 3pm today with a confirmed payment time, and I'll stay with it until the money is in your account.\"", tag: "reassure", trust: 2, compliance: 2, reply: "By 3pm? Okay. I'll wait for your call." },
            { label: "\"I'll pass this to the right department. They'll contact you.\"", tag: "brief", trust: -3, reply: "Another department…" },
            { label: "\"I'll send you ₦2m from my own account and sort it out with Operations later.\"", tag: "reassure", trust: 2, compliance: -15, reply: "You'd do that for me?" },
          ] },
        { client: "(3:00pm) Operations confirm payment tomorrow by 10am. \"Tomorrow? The school wants it by Friday… I'm thinking of moving everything to my nephew's bank.\"",
          options: [
            { label: "\"I understand, Ma. It lands tomorrow by 10am, a day before the deadline, and I'll call you at 10:15 to confirm. To make things easier next time, may I show you how to track requests on WealthBuddy and set up a small emergency reserve you can access any day?\"", tag: "empathy", trust: 3, growth: true, needsFor: "confidence", reply: "You've been very kind. Okay, let's keep the money here." },
            { label: "\"Moving your money will cost you. There are exit fees.\"", tag: "pressure", trust: -4, reply: "So now you're threatening me?" },
            { label: "\"Okay Ma, noted.\"", tag: "brief", trust: -2, reply: "Hmm." },
          ] },
      ],
      outcomes: {
        closed: "Mrs Eze stays, rates the call 5/5 and tells her church group about \"the kind young person at Meristem\".",
        partial: "The money arrives on time, but she moves half of her portfolio to her nephew's bank \"just in case\".",
        lost: "She closes her account and posts about the experience on Facebook.",
      },
    },
    {
      id: "okeke", pilot: true, segment: "middle", kind: "Advisory: detail-driven prospect", style: "analytical",
      emoji: "👩🏾‍⚕️", name: "Dr (Mrs) Ifeoma Okeke", profile: "45 · Consultant pathologist · booked a meeting after reading the factsheet",
      value: 20000000, valueLabel: "AUM", growthLabel: "Goal-based education plan",
      cues: ["Arrives with printed factsheets, highlighted", "Asks \"how exactly is that calculated?\"", "Mentions a bad experience elsewhere"],
      needs: [{ id: "education", label: "Two children start university abroad in 8 years (FX exposure)" }, { id: "fees", label: "Was burned by hidden fees; needs full transparency" }],
      startTrust: 45,
      stages: [
        { client: "I've read your money-market fund factsheet. Before anything else, how is the yield calculated, and what are the fees?",
          options: [
            { label: "\"Of course. The yield shown is net of the management fee. Here's the fee schedule and the fund's daily yields for the last 12 months.\"", tag: "data", trust: 1, compliance: 3, reply: "Good. That's what I wanted." },
            { label: "\"Let me tell you how one of my clients doubled her money!\"", tag: "story", trust: -1, reply: "Anecdotes aren't data." },
            { label: "\"The returns are good, Ma. Don't worry about the details.\"", tag: "brief", trust: -3, reply: "I do worry about the details." },
          ] },
        { client: "Why would I choose this over buying T-bills directly?",
          options: [
            { label: "\"It depends on your goals and timeline. May I ask what this money is ultimately for?\"", tag: "question", trust: 1, reveals: "education", reply: "My two children start university abroad in eight years." },
            { label: "\"Our fund is simply better. Let's not overthink it.\"", tag: "pressure", trust: -2, reply: "I'll be the judge of that." },
            { label: "\"T-bills: direct and fixed tenor. The fund: daily liquidity, diversification and managed reinvestment. Here's a side-by-side comparison.\"", tag: "data", trust: 0, reply: "Helpful. Continue." },
          ] },
        { client: "I should tell you, I had a bad experience with an advisor at another firm.",
          options: [
            { label: "\"I'm sorry to hear that. What went wrong, so I can make sure we're completely clear on it?\"", tag: "question", trust: 1, reveals: "fees", reply: "Hidden fees and no reporting. I found out a year later." },
            { label: "\"Don't worry, we're different!\"", tag: "rapport", trust: -1, reply: "Everyone says that." },
            { label: "\"We're regulated by the SEC.\"", tag: "reassure", trust: 1, reply: "So were they." },
          ] },
        { client: "So what would you propose?",
          options: [
            { label: "\"Two parts. A liquid portion in the money-market fund. An 8-year education pot with a mix that includes dollar-denominated instruments to manage FX risk. A written fee schedule and quarterly statements. Returns aren't guaranteed; here are the risks.\"", tag: "data", trust: 1, compliance: 5, reply: "This is the first proposal that actually answers my situation." },
            { label: "\"Our bond fund will definitely beat inflation.\"", tag: "reassure", trust: 0, compliance: -15, reply: "Definitely? On what basis?" },
            { label: "\"Let's go with what most doctors choose: our equity fund.\"", tag: "story", trust: -1, reply: "I'm not 'most doctors'." },
          ] },
        { client: "I need time to review this.",
          options: [
            { label: "\"Absolutely. I'll email the proposal, fee schedule and risk disclosures today, and book a 20-minute review call next Tuesday for any questions.\"", tag: "data", trust: 0, growth: true, needsFor: "education", reply: "Tuesday works. Thank you for not rushing me." },
            { label: "\"Rates may drop tomorrow. Better to decide today.\"", tag: "pressure", trust: -2, reply: "Then I'll take my chances." },
            { label: "\"Sure! Let's also connect on Instagram.\"", tag: "rapport", trust: -2, reply: "…I'll wait for the email." },
          ] },
      ],
      outcomes: {
        closed: "On Tuesday Dr Okeke invests ₦20m in a goal-based education plan, and asks for the same review for her husband.",
        partial: "She starts with ₦5m in the money-market fund to \"see the reporting first\".",
        lost: "She thanks you for your time. Her email never comes.",
      },
    },
    {
      id: "bakare", segment: "back", kind: "Internal client: urgent request vs. control", style: "expressive",
      emoji: "🧑🏾‍💼", name: "Kunle Bakare", profile: "Senior Relationship Manager (front office) · you are in Operations",
      value: 25000000, valueLabel: "Redemption processed correctly", growthLabel: "Process improvement for the RM team",
      cues: ["Bursts in smiling: \"My guy! My person!\"", "Talks about his \"VIP\" and the MD", "Hates forms; loves a hero story"],
      needs: [{ id: "thirdparty", label: "Payment is to a third party (a property developer), not the client" }, { id: "deadline", label: "The deal closes at 4pm today" }],
      startTrust: 50,
      stages: [
        { client: "My guy! My VIP client needs ₦25 million paid out TODAY. You're the best in Ops. Make it happen, abeg!",
          options: [
            { label: "\"Kunle! Always a pleasure. Sit down. Let's see how we can help your VIP.\"", tag: "rapport", trust: 1, reply: "That's my person!" },
            { label: "\"Send it through the portal. It'll be treated in turn.\"", tag: "brief", trust: -2, reply: "In turn?! This is a VIP!" },
            { label: "\"For you? Consider it done. I'll push it now.\"", tag: "reassure", trust: 2, compliance: -5, reply: "Legend!" },
          ] },
        { client: "Just pay it. The instruction is in the email.",
          options: [
            { label: "\"Let me check the instruction. Whose account is the payment going to?\"", tag: "question", trust: 1, reveals: "thirdparty", reply: "Ah… the developer's account. The client is buying a property today." },
            { label: "\"Funny story: last month someone pushed a payment like this and we got a Compliance query…\"", tag: "story", trust: -2, reply: "Haha, that's not us." },
            { label: "\"Okay, processing.\"", tag: "brief", trust: 0, compliance: -5, reply: "Sharp!" },
          ] },
        { client: "Can't you just do it? Everybody knows this client.",
          options: [
            { label: "\"What time does the deal close? Let's see what's possible within the rules.\"", tag: "question", trust: 1, reveals: "deadline", reply: "4pm. The developer won't hold the unit." },
            { label: "\"No mandate, no payment. Next!\"", tag: "pressure", trust: -2, reply: "Wow. Okay." },
            { label: "\"Don't worry, it'll be fine.\"", tag: "reassure", trust: 0, reply: "So you'll do it?" },
          ] },
        { client: "So? What can you do?",
          options: [
            { label: "\"Here's how we win this: third-party payments need the client's signed mandate and a call-back. If the client emails a signed mandate from their registered address now, I'll do the call-back immediately and pay the developer by 2pm. Or I can pay the client's own verified account in 30 minutes.\"", tag: "rapport", trust: 2, compliance: 8, reply: "2pm? Let me call him now. You're a star!" },
            { label: "\"I'll pay the developer now. The mandate can come tomorrow.\"", tag: "reassure", trust: 2, compliance: -25, reply: "Legend! I owe you lunch." },
            { label: "\"Rules are rules. I can't help.\"", tag: "brief", trust: -4, compliance: 3, reply: "Unbelievable. I'm escalating to my Head." },
          ] },
        { client: "(1:45pm, mandate verified and paid.) You saved my life! Can I tell the MD you're the reason we closed this?",
          options: [
            { label: "\"Happy to help! Next time, tag requests 'time-critical' on the portal with the mandate attached and I'll fast-track them. Shall I share a one-page checklist with your team?\"", tag: "rapport", trust: 2, growth: true, needsFor: "thirdparty", reply: "Send it! I'll share it with the whole team." },
            { label: "\"Just don't do this to me again.\"", tag: "brief", trust: -2, reply: "Ah, okay o." },
            { label: "\"Sure, and tell him I need a promotion!\"", tag: "story", trust: 0, reply: "Haha! Will do." },
          ] },
      ],
      outcomes: {
        closed: "Paid at 1:45pm with a verified mandate. Kunle's whole team adopts your checklist, and time-critical requests drop by half.",
        partial: "Paid correctly but late. The client almost lost the unit, and Kunle grumbles about Ops at the team meeting.",
        lost: "Kunle escalates to his Head and the client misses the deadline.",
      },
    },
  ],
});
