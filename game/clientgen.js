/*
 * MeriQuest — client generator (DRAFT content pack)
 *
 * Generates unlimited unique clients by combining building blocks:
 *   case type (23) × personality style (4) × channel (7) × tier (4) × mood (4) × location
 *   (24 Nigerian cities in every region, 8 diaspora cities, 7 international) × name pools
 * Complexity (1–5 stars) is derived from the case's base difficulty plus tier, mood and channel.
 *
 * A generated contact plays as:  opener (tone) → case stages (substance) → close (tone + growth)
 *   - Tone options carry an approach tag; the client's style decides how well it lands.
 *   - Substance options carry a quality rating (best / ok / poor) and may hide compliance traps.
 *
 * Real CX cases from Meristem can be added as new entries in CASES (see docs/templates).
 */
(function () {
  const C = window.MERIQUEST_CONTENT;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const fmt = (n) => (n >= 1e9 ? "₦" + +(n / 1e9).toFixed(1) + "bn" : n >= 1e6 ? "₦" + +(n / 1e6).toFixed(1) + "m" : "₦" + Math.round(n / 1000) + "k");

  /* ---------- names ---------- */
  const NAMES = {
    yoruba: { f: ["Funke", "Bisi", "Kemi", "Yetunde", "Bukola", "Tolu", "Adunni", "Folake"], m: ["Tunde", "Segun", "Femi", "Dapo", "Wale", "Kunle", "Bayo", "Gbenga"], s: ["Adeyemi", "Ogunleye", "Balogun", "Adewale", "Olatunji", "Akinola", "Oyelaran", "Fashola"] },
    igbo: { f: ["Ngozi", "Ifeoma", "Chiamaka", "Nneka", "Adaeze", "Uju", "Chinwe", "Obiageli"], m: ["Chidi", "Emeka", "Obinna", "Uche", "Ikenna", "Chukwudi", "Nnamdi", "Kelechi"], s: ["Okafor", "Eze", "Nwosu", "Okeke", "Obi", "Chukwu", "Onyekachi", "Anyanwu"] },
    hausa: { f: ["Aisha", "Zainab", "Hauwa", "Fatima", "Maryam", "Amina", "Hadiza", "Rakiya"], m: ["Musa", "Ibrahim", "Abubakar", "Sani", "Yusuf", "Aminu", "Bashir", "Umar"], s: ["Danjuma", "Abdullahi", "Bello", "Usman", "Garba", "Lawal", "Sule", "Yakubu"] },
    global: { f: ["Emily", "Sarah", "Claire", "Ama", "Wanjiru", "Priya", "Mei"], m: ["James", "Pierre", "Kwame", "David", "Otieno", "Rahul", "Wei"], s: ["Smith", "Dubois", "Mensah", "Johnson", "Kamau", "Sharma", "Chen"] },
    southsouth: { f: ["Efe", "Tamuno", "Ini", "Ebiere", "Ime", "Ofonime", "Tari", "Oghenekaro"], m: ["Ovie", "Ebi", "Etim", "Tonye", "Edidiong", "Ese", "Preye", "Akpan"], s: ["Etim", "Briggs", "Okon", "Ekanem", "Douglas", "Ogbe", "Akpabio", "Amadi"] },
  };

  /* ---------- where clients are: all of Nigeria, the diaspora, and international ---------- */
  const LOCATIONS = {
    ng: [
      { city: "Lagos", region: "South West", names: "yoruba" }, { city: "Ibadan", region: "South West", names: "yoruba" }, { city: "Abeokuta", region: "South West", names: "yoruba" }, { city: "Akure", region: "South West", names: "yoruba" },
      { city: "Abuja", region: "FCT", names: "any" }, { city: "Kano", region: "North West", names: "hausa" }, { city: "Kaduna", region: "North West", names: "hausa" }, { city: "Sokoto", region: "North West", names: "hausa" },
      { city: "Maiduguri", region: "North East", names: "hausa" }, { city: "Yola", region: "North East", names: "hausa" }, { city: "Jos", region: "North Central", names: "any" }, { city: "Ilorin", region: "North Central", names: "yoruba" },
      { city: "Makurdi", region: "North Central", names: "any" }, { city: "Lokoja", region: "North Central", names: "any" }, { city: "Enugu", region: "South East", names: "igbo" }, { city: "Onitsha", region: "South East", names: "igbo" },
      { city: "Owerri", region: "South East", names: "igbo" }, { city: "Aba", region: "South East", names: "igbo" }, { city: "Port Harcourt", region: "South South", names: "southsouth" }, { city: "Uyo", region: "South South", names: "southsouth" },
      { city: "Calabar", region: "South South", names: "southsouth" }, { city: "Benin City", region: "South South", names: "southsouth" }, { city: "Warri", region: "South South", names: "southsouth" }, { city: "Asaba", region: "South South", names: "igbo" },
    ],
    diaspora: [
      { city: "London", country: "UK", tz: 0 }, { city: "Manchester", country: "UK", tz: 0 }, { city: "Houston", country: "USA", tz: -6 }, { city: "New York", country: "USA", tz: -5 },
      { city: "Toronto", country: "Canada", tz: -5 }, { city: "Dubai", country: "UAE", tz: 4 }, { city: "Johannesburg", country: "South Africa", tz: 2 }, { city: "Accra", country: "Ghana", tz: 0 },
    ],
    global: [
      { city: "London", country: "UK", tz: 0 }, { city: "New York", country: "USA", tz: -5 }, { city: "Paris", country: "France", tz: 1 }, { city: "Accra", country: "Ghana", tz: 0 },
      { city: "Nairobi", country: "Kenya", tz: 3 }, { city: "Mumbai", country: "India", tz: 5.5 }, { city: "Shanghai", country: "China", tz: 8 },
    ],
  };
  const ORIGIN_LABEL = { ng: "Nigeria", diaspora: "Diaspora", global: "International" };

  /* ---------- tiers ---------- */
  const TIERS = {
    mass: { label: "Retail", emoji: "🙂", value: [50e3, 2e6], occupations: ["Teacher", "Trader at Balogun", "Civil servant", "Nurse", "Ride-hailing driver", "Fresh graduate", "Tailor", "Pharmacist"], cx: 0 },
    affluent: { label: "Affluent", emoji: "💼", value: [2e6, 30e6], occupations: ["Product manager", "Doctor", "Lawyer", "Bank manager", "Oil & gas engineer", "Architect", "SME owner", "Lecturer"], cx: 1 },
    hni: { label: "HNI · VIP", emoji: "💎", value: [30e6, 500e6], occupations: ["Business owner", "Retired executive", "Real-estate developer", "Consultant surgeon", "Importer", "Music executive"], cx: 2, vip: true },
    corporate: { label: "Corporate", emoji: "🏢", value: [100e6, 5e9], occupations: ["Group treasurer", "CFO, manufacturing firm", "Finance manager, NGO", "Pension desk lead", "Company secretary"], cx: 2, vip: true },
  };

  /* ---------- moods ---------- */
  const MOODS = {
    calm: { label: "Calm", emoji: "🙂", trust: 10, cx: 0 },
    anxious: { label: "Anxious", emoji: "😟", trust: 0, cx: 1 },
    irritated: { label: "Irritated", emoji: "😤", trust: -8, cx: 1 },
    angry: { label: "Angry", emoji: "😡", trust: -16, cx: 2 },
  };

  /* ---------- channels ---------- */
  const CHANNELS = {
    call: { label: "Phone call", emoji: "📞", sla: 10, turn: 2, trust: 0, tip: "Tone carries everything. Verify identity before discussing the account." },
    whatsapp: { label: "WhatsApp", emoji: "💬", sla: 20, turn: 2, trust: 0, tip: "Warm and quick. Never request passwords, OTPs or full card/BVN details in chat." },
    sms: { label: "SMS", emoji: "✉️", sla: 60, turn: 1, trust: 0, tip: "Keep it short. No sensitive data over SMS; move complex issues to a call." },
    email: { label: "Email", emoji: "📧", sla: 120, turn: 3, trust: 5, tip: "Structured and complete: greeting, answer, next step, timeline, sign-off." },
    chatbot: { label: "Chatbot hand-off", emoji: "🤖", sla: 10, turn: 1, trust: -6, cx: 1, tip: "The client already tried the bot. Don't make them repeat themselves." },
    walkin: { label: "Walk-in", emoji: "🚶🏾", sla: 15, turn: 3, trust: 5, tip: "Greet, seat, verify. Body language matters." },
    social: { label: "Social media", emoji: "📣", sla: 30, turn: 2, trust: -4, cx: 1, tip: "Public! Acknowledge publicly, then move to DM. Never post account details." },
  };

  /* ---------- how each style writes (cues) ---------- */
  const STYLE_CUES = {
    driver: ["Short and direct. Wants it done now.", "Skips greetings. Asks \"how long?\"", "Writes in brief, clipped sentences."],
    analytical: ["Precise. Quotes figures and dates.", "Asks exactly how things are calculated.", "Long, well-structured message with reference numbers."],
    amiable: ["Polite and worried. Mentions family.", "Apologises for \"disturbing\" you.", "Warm tone, asks if you are the right person to help."],
    expressive: ["Lots of emojis and exclamation marks!!", "Chatty. Tells you the whole story.", "Mentions who they know and what they posted."],
  };

  /* ---------- tone openers & closers ---------- */
  const OPENERS = {
    issue: [
      { tag: "empathy", label: "\"I'm really sorry about this, {t}. I understand how frustrating it is, and I'll work through it with you right now.\"" },
      { tag: "brief", label: "\"Thanks, {t}. Let's fix this quickly. I just need to confirm a couple of details.\"" },
      { tag: "data", label: "\"Thank you, {t}. I'm pulling up your records now so I can give you exact dates and figures.\"" },
      { tag: "rapport", label: "\"Hello {t}! Good to hear from you. Don't worry, you're in good hands.\"" },
    ],
    inquiry: [
      { tag: "rapport", label: "\"Hello {t}! Great to hear from you. I'd love to help you with this.\"" },
      { tag: "brief", label: "\"Thanks, {t}. Here's the short answer, then we can go deeper if you like.\"" },
      { tag: "data", label: "\"Good question, {t}. Let me give you the exact figures and options.\"" },
      { tag: "story", label: "\"Great question, {t}! Many of our clients started exactly where you are. Let me show you how it worked for them.\"" },
    ],
  };
  const CLOSERS = [
    { tag: "empathy", q: "best", label: "\"I've logged everything and I'll personally update you by {when}. Is there anything else worrying you?\"" },
    { tag: "brief", q: "best", label: "\"Done. Reference number sent. You'll hear from me by {when}.\"" },
    { tag: "data", q: "best", label: "\"Summary: what we did, the reference number, and the next update by {when}. I've sent it in writing too.\"" },
    { tag: "rapport", q: "best", label: "\"Always a pleasure, {t}! I'll check in by {when}. Enjoy the rest of your day!\"" },
  ];
  const ABRUPT = { tag: "brief", q: "poor", label: "\"Okay. Bye.\"" };

  /* ---------- case library: pilot units cx / wealth / invest ----------
   * base: base complexity 1–5 · kind: issue | inquiry · channels: where it shows up
   * msg: the client's first message ({amt} filled from tier) · needs: hidden needs
   * stages: substance decisions · growth: optional cross-sell/improvement offered at close
   */
  const CASES = [
    /* ===== Customer Experience ===== */
    { id: "stmt", tiers: ["mass", "affluent", "hni"], unit: "cx", base: 1, kind: "issue", channels: ["email", "whatsapp", "sms", "chatbot"], title: "Statement request",
      msg: "Please send my statement of account for the last quarter. I need it for a visa application.",
      needs: [{ id: "visa", label: "Needs it stamped for a visa appointment this week" }],
      stages: [{ prompt: "How do you send it?", options: [
        { q: "best", label: "Verify identity, then send it to the registered email, and ask if the embassy needs a stamped copy.", reveals: "visa" },
        { q: "poor", label: "Send it to whatever email or number they just messaged from.", compliance: -10 },
        { q: "ok", label: "Tell them to download it from the app themselves." },
      ] }] },
    { id: "login", tiers: ["mass", "affluent"], unit: "cx", base: 1, kind: "issue", channels: ["whatsapp", "chatbot", "call", "social"], title: "Can't log in to WealthBuddy",
      msg: "I can't log in to WealthBuddy. It keeps saying invalid credentials and I need to top up today.",
      needs: [{ id: "topup", label: "Wants to fund a goal before a promo deadline today" }],
      stages: [{ prompt: "What do you do?", options: [
        { q: "best", label: "Walk them through the in-app password reset to their registered phone/email. Confirm their deadline and offer bank-transfer funding as a backup.", reveals: "topup" },
        { q: "poor", label: "Ask them to send their password and OTP so you can log in and check.", compliance: -25 },
        { q: "ok", label: "Raise an IT ticket and tell them to wait 48 hours." },
      ] }] },
    { id: "dividend", unit: "cx", base: 2, kind: "issue", channels: ["email", "call", "walkin"], title: "Dividends not received",
      msg: "I haven't received dividends on my shares for two years. Where is my money?",
      needs: [{ id: "mandate", label: "No e-dividend mandate on file; old bank account was closed" }],
      stages: [{ prompt: "How do you handle it?", options: [
        { q: "best", label: "Check the register via Meristem Registrar, find the missing e-dividend mandate, help them complete it, and trace the unclaimed dividends.", reveals: "mandate" },
        { q: "ok", label: "Give them the Registrar's email address." },
        { q: "poor", label: "Tell them the company probably didn't pay dividends." },
      ] }], growth: "Set up e-dividend mandates for all their holdings" },
    { id: "kycupdate", unit: "cx", base: 2, kind: "issue", channels: ["call", "whatsapp", "email"], title: "Change of phone number",
      msg: "I've changed my phone number. Please update it on my account so I get my alerts.",
      needs: [{ id: "lostphone", label: "Old phone was stolen: possible account-takeover risk" }],
      stages: [{ prompt: "What's the right process?", options: [
        { q: "best", label: "Ask why it changed (it was stolen), flag possible takeover risk, and update only with the signed change form, valid ID and a call-back to the verified details.", reveals: "lostphone" },
        { q: "poor", label: "Update it immediately on their request. They sound genuine.", compliance: -20 },
        { q: "ok", label: "Tell them to visit a branch, without explaining what to bring." },
      ] }] },
    { id: "redemption", unit: "cx", base: 3, kind: "issue", channels: ["call", "whatsapp", "email", "social"], title: "Delayed redemption",
      msg: "I requested to withdraw {amt} five days ago and nothing has happened. This is unacceptable.",
      needs: [{ id: "urgent", label: "Needs the money for rent due in 2 days" }, { id: "trust", label: "Worried the firm is in trouble" }],
      stages: [
        { prompt: "First step?", options: [
          { q: "best", label: "Apologise, ask what the funds are for and by when, and check the request status with Operations.", reveals: "urgent" },
          { q: "ok", label: "Tell them it's processing and should come soon." },
          { q: "poor", label: "Explain that the T&Cs allow up to 10 working days." },
        ] },
        { prompt: "They ask: \"Is Meristem in trouble?\"", options: [
          { q: "best", label: "Acknowledge the worry and explain the delay (a batch issue, now fixed). Confirm a payment time with Operations and commit to a call-back.", reveals: "trust" },
          { q: "poor", label: "\"I can't comment on that.\"" },
          { q: "poor", label: "Promise the money will land within one hour, without checking.", compliance: -5 },
        ] },
      ], growth: "Offer an instant-access emergency pot on WealthBuddy" },
    { id: "fees", unit: "cx", base: 3, kind: "issue", channels: ["email", "call", "whatsapp"], title: "Unexpected charge",
      msg: "Why was {amt} deducted from my account as 'fees'? Nobody told me about this charge!",
      needs: [{ id: "error", label: "The charge was actually duplicated in error" }],
      stages: [
        { prompt: "How do you investigate?", options: [
          { q: "best", label: "Pull the transaction history and fee schedule and check line by line. You find a duplicate posting.", reveals: "error" },
          { q: "ok", label: "Send them the fee schedule PDF." },
          { q: "poor", label: "Tell them all fees are in the T&Cs they signed." },
        ] },
        { prompt: "Next?", options: [
          { q: "best", label: "Apologise, raise the reversal with Finance/Operations, give a date, log it as a complaint and confirm in writing." },
          { q: "ok", label: "Reverse it yourself from the suspense account to save time.", compliance: -10 },
          { q: "poor", label: "Ask them to write a formal letter." },
        ] },
      ] },
    { id: "fraud", unit: "cx", base: 4, kind: "issue", channels: ["call", "whatsapp", "social"], title: "Fake 'Meristem' caller",
      msg: "Someone called me from 'Meristem' asking for my OTP to 'upgrade my account'. Did you people call me?",
      needs: [{ id: "shared", label: "They already shared an OTP once" }, { id: "elderly", label: "Their elderly parent uses the same phone" }],
      stages: [
        { prompt: "What do you ask and say?", options: [
          { q: "best", label: "Confirm Meristem never asks for OTPs, then calmly ask whether they shared anything.", reveals: "shared" },
          { q: "ok", label: "Say \"we never call\" and end there." },
          { q: "poor", label: "Ask them to read out the OTP so you can check if it's valid.", compliance: -25 },
        ] },
        { prompt: "They admit sharing one OTP yesterday.", options: [
          { q: "best", label: "Place a temporary restriction, escalate to Information Security and Fraud, review recent activity, reset credentials, and ask who else uses the phone.", reveals: "elderly" },
          { q: "ok", label: "Tell them to change their password." },
          { q: "poor", label: "Tell them it's their fault and nothing can be done." },
        ] },
      ], growth: "Enrol them (and their parent) in the scam-awareness session on MORE" },
    { id: "socialrant", unit: "cx", base: 4, kind: "issue", channels: ["social"], title: "Viral public complaint",
      msg: "@Meristem you people are SCAMMERS!! 3 weeks and my money is stuck. RT so everybody sees 😡😡",
      needs: [{ id: "facts", label: "Their withdrawal failed because of a bank-name mismatch" }],
      stages: [
        { prompt: "Public reply?", options: [
          { q: "best", label: "Reply publicly: \"We're sorry, we're on it. Please check your DM.\" Then move to DM and verify identity there." },
          { q: "poor", label: "Reply publicly with their account balance and transaction history to prove the money is there.", compliance: -25 },
          { q: "poor", label: "Ignore it. It will die down." },
        ] },
        { prompt: "In DM:", options: [
          { q: "best", label: "Find the root cause (bank-name mismatch), explain it plainly, fix it with a corrected mandate, and commit to a payment date.", reveals: "facts" },
          { q: "ok", label: "Ask them to delete the tweet first." },
          { q: "poor", label: "Threaten legal action for defamation." },
        ] },
      ] },
    { id: "bereavement", tiers: ["mass", "affluent", "hni"], unit: "cx", base: 4, kind: "issue", channels: ["call", "walkin", "email"], title: "Deceased client's account",
      msg: "My father passed away last month. He had investments with you. I don't know what to do.",
      needs: [{ id: "will", label: "There is a will with Meristem Trustees" }, { id: "fees", label: "School fees for younger siblings are due" }],
      stages: [
        { prompt: "First response?", options: [
          { q: "best", label: "Offer condolences, take it slowly, and ask gently whether there is a will and who the executors or administrators are.", reveals: "will" },
          { q: "poor", label: "Send the 12-item probate checklist straight away." },
          { q: "poor", label: "Share the account balance with them since they're family.", compliance: -20 },
        ] },
        { prompt: "Next?", options: [
          { q: "best", label: "Coordinate with Meristem Trustees and Registrar (probate), explain the steps and timelines, and ask about urgent family needs.", reveals: "fees" },
          { q: "ok", label: "Tell them to get a lawyer and come back." },
          { q: "poor", label: "Freeze everything and tell them to wait for a letter." },
        ] },
      ] },
    { id: "botloop", tiers: ["mass", "affluent"], unit: "cx", base: 2, kind: "issue", channels: ["chatbot"], title: "Stuck in the chatbot loop",
      msg: "Your bot has asked me the same question 4 times!!! I just want to know my fund balance.",
      needs: [{ id: "bug", label: "Bot fails for clients with more than one fund" }],
      stages: [{ prompt: "What do you do?", options: [
        { q: "best", label: "Apologise for the bot, verify identity, give the balance securely, and ask what they typed so you can report the bug.", reveals: "bug" },
        { q: "ok", label: "Give the balance once verified." },
        { q: "poor", label: "Send them back to the bot with better instructions." },
      ] }], growth: "Log the bot failure pattern to the Digital team (process improvement)" },

    /* ===== Wealth Advisory ===== */
    { id: "starter", tiers: ["mass"], unit: "wealth", base: 1, kind: "inquiry", channels: ["whatsapp", "sms", "chatbot", "social", "walkin"], title: "How do I start investing?",
      msg: "Hi, I want to start investing. I only have {amt}. Is that enough?",
      needs: [{ id: "goal", label: "Saving for a master's programme in 18 months" }],
      stages: [{ prompt: "Your advice?", options: [
        { q: "best", label: "Yes! Ask about their goal and timeline, then suggest a WealthBuddy goal plan in the money-market fund with monthly auto-invest.", reveals: "goal", value: true },
        { q: "poor", label: "Tell them to buy whichever stock is trending.", compliance: -5 },
        { q: "ok", label: "Send the product brochure link." },
      ] }], growth: "Set up monthly auto-invest" },
    { id: "rollover", tiers: ["mass", "affluent", "hni"], unit: "wealth", base: 2, kind: "inquiry", channels: ["email", "call", "whatsapp"], title: "T-bill maturing",
      msg: "My {amt} T-bill matures on Friday. Should I roll it over?",
      needs: [{ id: "car", label: "Wants to buy a car in 2 months" }],
      stages: [{ prompt: "How do you respond?", options: [
        { q: "best", label: "Ask about upcoming cash needs (a car in 2 months). Suggest a shorter tenor or splitting into money market + a 91-day bill, and share current indicative rates.", reveals: "car", value: true },
        { q: "ok", label: "Roll everything into a 364-day bill automatically." },
        { q: "poor", label: "Promise that rates will go up next week, so they should wait.", compliance: -8 },
      ] }] },
    { id: "breaklock", unit: "wealth", base: 3, kind: "issue", channels: ["call", "whatsapp", "walkin"], title: "Wants to break a locked plan",
      msg: "I need to withdraw my {amt} fixed plan now. I don't care about the penalty.",
      needs: [{ id: "shortfall", label: "Needs only part of it, for a 6-week business shortfall" }],
      stages: [
        { prompt: "What do you explore?", options: [
          { q: "best", label: "Ask what the money is for and how much is actually needed. It's a short business gap for part of the amount.", reveals: "shortfall" },
          { q: "ok", label: "Process the full liquidation with the penalty." },
          { q: "poor", label: "Refuse. It's locked." },
        ] },
        { prompt: "Options?", options: [
          { q: "best", label: "Explain the penalty vs. alternatives: a partial liquidation, or a cash/equity-backed facility from Meristem Finance. Show the costs side by side so they can choose.", value: true },
          { q: "poor", label: "Book a loan for them without explaining the interest.", compliance: -10 },
          { q: "ok", label: "Partial liquidation only." },
        ] },
      ], growth: "Cross-sell a Meristem Finance cash-backed facility" },
    { id: "yieldchaser", unit: "wealth", base: 3, kind: "inquiry", channels: ["whatsapp", "call", "social"], title: "\"I want 30%, guaranteed\"",
      msg: "My friend's platform pays 30% monthly guaranteed. Can you beat that? I have {amt}.",
      needs: [{ id: "ponzi", label: "The friend's platform has stopped paying out" }],
      stages: [{ prompt: "How do you handle it?", options: [
        { q: "best", label: "Explain that no regulated investment guarantees 30% a month. Ask how the friend's withdrawals are going (they've stopped). Share the SEC warning signs, then offer realistic options.", reveals: "ponzi", value: true },
        { q: "poor", label: "Match it: \"We can guarantee 25%.\"", compliance: -25 },
        { q: "ok", label: "Say \"we don't do that\" and end the chat." },
      ] }], growth: "Invite them to the MORE 'Spot the scam' session" },
    { id: "diaspora", origins: ["diaspora"], tiers: ["affluent", "hni"], unit: "wealth", base: 3, kind: "inquiry", channels: ["email", "whatsapp"], title: "Diaspora client: dollar investment",
      msg: "I live in the UK and want to invest {amt}-equivalent in dollars back home. What are my options?",
      needs: [{ id: "parents", label: "Wants monthly naira income for their parents in Ibadan" }, { id: "kyc", label: "Only has a UK address and an expired Nigerian passport" }],
      stages: [
        { prompt: "Discovery?", options: [
          { q: "best", label: "Ask about their goals. They want monthly naira support for their parents plus dollar growth.", reveals: "parents" },
          { q: "ok", label: "Send the dollar fund factsheet." },
          { q: "poor", label: "Recommend crypto." },
        ] },
        { prompt: "Onboarding?", options: [
          { q: "best", label: "Explain non-resident KYC (valid ID, proof of foreign address, BVN/NIN if available), check their documents, and propose a dollar fund plus a naira income plan.", reveals: "kyc", value: true },
          { q: "poor", label: "Open the account with the expired passport. You'll fix it later.", compliance: -15 },
          { q: "ok", label: "Tell them to come in when they're next in Nigeria." },
        ] },
      ] },
    { id: "legacy", unit: "wealth", base: 4, kind: "inquiry", channels: ["walkin", "call", "email"], title: "HNI succession worries",
      msg: "I'm getting older. I have {amt} spread across many places, and my children fight about everything.",
      needs: [{ id: "family", label: "Children from two marriages" }, { id: "business", label: "The family business has no succession plan" }],
      stages: [
        { prompt: "How do you explore?", options: [
          { q: "best", label: "Listen first: ask gently about the family structure and what a good outcome looks like.", reveals: "family", tag: "empathy" },
          { q: "ok", label: "Present our fund range." },
          { q: "poor", label: "Suggest they put everything in one child's name to keep it simple.", compliance: -10 },
        ] },
        { prompt: "Proposal?", options: [
          { q: "best", label: "Propose a joint session with Meristem Trustees (will and trusts) and the Family Office (governance and business succession), plus a consolidated portfolio review.", reveals: "business", value: true },
          { q: "ok", label: "Refer them to Trustees by email." },
          { q: "poor", label: "Tell them to sort it out with a lawyer first." },
        ] },
      ], growth: "Family Office + Trustees engagement" },

    /* ===== Investment Advisory ===== */
    { id: "hotstock", unit: "invest", base: 3, kind: "inquiry", channels: ["whatsapp", "call", "social"], title: "\"Should I buy this stock now?\"",
      msg: "Everyone on Twitter is buying this bank stock after the news. Should I put {amt} in today?",
      needs: [{ id: "concentration", label: "Already 60% of their portfolio is in bank stocks" }],
      stages: [{ prompt: "Your advice?", options: [
        { q: "best", label: "Share Research's note and the risks, check their current holdings (already 60% in banks), and discuss concentration before any trade. They decide.", reveals: "concentration", value: true },
        { q: "poor", label: "\"Buy now, it will double.\"", compliance: -15 },
        { q: "ok", label: "Execute the order on Meritrade as instructed, with no discussion." },
      ] }] },
    { id: "underperf", unit: "invest", base: 3, kind: "issue", channels: ["email", "call"], title: "\"My portfolio is underperforming\"",
      msg: "My portfolio returned less than my cousin's fixed deposit this year. What am I paying you for?",
      needs: [{ id: "benchmark", label: "Their portfolio actually beat its benchmark; the comparison is apples to oranges" }, { id: "horizon", label: "Goal is 10 years away; risk profile is growth" }],
      stages: [
        { prompt: "How do you respond?", options: [
          { q: "best", label: "Show the performance against the agreed benchmark and the risk taken, with a clear chart.", reveals: "benchmark", tag: "data" },
          { q: "poor", label: "Promise next year will be better.", compliance: -5 },
          { q: "ok", label: "Offer a fee discount to calm them down." },
        ] },
        { prompt: "Next?", options: [
          { q: "best", label: "Revisit their goal and horizon. If either has changed, re-profile and rebalance; if not, agree on quarterly reviews.", reveals: "horizon" },
          { q: "ok", label: "Move everything to fixed deposits as they asked." },
          { q: "poor", label: "Tell them they don't understand investing." },
        ] },
      ] },
    { id: "ratehike", unit: "invest", base: 3, kind: "inquiry", channels: ["email", "whatsapp", "call"], title: "Rate hike and my bonds",
      msg: "The CBN just hiked rates. My bond fund is down. Should I sell my {amt} holding?",
      needs: [{ id: "hold", label: "They plan to hold to maturity for retirement income" }],
      stages: [{ prompt: "Explain and advise:", options: [
        { q: "best", label: "Explain that bond prices fall when yields rise, and new money now earns more. Ask about their horizon (hold to maturity) and discuss holding or adding gradually.", reveals: "hold", value: true },
        { q: "poor", label: "Sell everything before it falls further.", compliance: -5 },
        { q: "ok", label: "Tell them not to worry, it always recovers." },
      ] }] },
    { id: "margincall", tiers: ["affluent", "hni"], unit: "invest", base: 5, kind: "issue", channels: ["call", "walkin"], title: "Margin call",
      msg: "You want me to top up {amt} by tomorrow or you'll sell my shares?! This is robbery!",
      needs: [{ id: "cash", label: "Expecting a large payment in 5 days" }, { id: "understand", label: "Never fully understood the margin terms" }],
      stages: [
        { prompt: "First?", options: [
          { q: "best", label: "Stay calm. Explain the margin terms and the collateral shortfall, and check what they understood when they signed.", reveals: "understand", tag: "data" },
          { q: "poor", label: "Quietly extend the deadline yourself without approval.", compliance: -15 },
          { q: "ok", label: "Read out the contract clause." },
        ] },
        { prompt: "Options?", options: [
          { q: "best", label: "Ask about their cash position (a payment in 5 days). Present the options: a partial top-up now, selling some holdings, or a formal extension request to Risk. Document their decision.", reveals: "cash" },
          { q: "ok", label: "Sell enough to cover the shortfall immediately." },
          { q: "poor", label: "Tell them to borrow from a loan app." },
        ] },
      ] },
    { id: "insidertip", unit: "invest", base: 5, kind: "inquiry", channels: ["whatsapp", "call"], title: "\"My brother says results are great\"",
      msg: "My brother works at a listed company. He says their results next week are mad. Buy {amt} worth for me quietly.",
      needs: [{ id: "mnpi", label: "Possible material non-public information" }],
      stages: [{ prompt: "What do you do?", options: [
        { q: "best", label: "Decline politely. Explain that trading on non-public information is insider dealing, record it, and report it to Compliance.", reveals: "mnpi" },
        { q: "poor", label: "Execute it. It's the client's instruction.", compliance: -30 },
        { q: "ok", label: "Decline but don't report it." },
      ] }] },
    { id: "fpi", origins: ["global"], unit: "invest", base: 4, kind: "inquiry", channels: ["email", "call"], title: "Foreign investor: Nigerian equities",
      msg: "We're a small fund looking to allocate {amt} to Nigerian equities. How do we get in, and how do we get our money out later?",
      needs: [{ id: "cci", label: "Hasn't heard of the Certificate of Capital Importation (CCI)" }, { id: "fx", label: "Main worry is FX liquidity when repatriating" }],
      stages: [
        { prompt: "Discovery?", options: [
          { q: "best", label: "Ask about their mandate, horizon and main concerns. FX repatriation is their biggest worry.", reveals: "fx", tag: "question" },
          { q: "ok", label: "Send the NGX market overview deck." },
          { q: "poor", label: "Assure them that FX is \"never a problem\" now.", compliance: -10 },
        ] },
        { prompt: "Onboarding path?", options: [
          { q: "best", label: "Explain the route: inflow through a custodian/authorised bank to obtain a CCI (needed for repatriation later), plus corporate KYC (incorporation documents, beneficial owners, sanctions screening). Then trading via Meristem Stockbrokers, with Research coverage.", reveals: "cci", value: true },
          { q: "poor", label: "Suggest they send the money through an informal channel to save time.", compliance: -30 },
          { q: "ok", label: "Refer them to a custodian bank and stop there." },
        ] },
      ], growth: "Research subscription + quarterly market call" },
    { id: "treasury", unit: "invest", base: 4, kind: "inquiry", channels: ["email", "call"], title: "Corporate cash placement",
      msg: "We have {amt} idle for 90 days. We want safety, liquidity and a good yield. Proposal by Thursday, please.",
      needs: [{ id: "board", label: "Board resolution and mandate not yet on file" }, { id: "payroll", label: "Needs 20% back in 30 days for payroll" }],
      stages: [
        { prompt: "Discovery?", options: [
          { q: "best", label: "Confirm their cash-flow timeline (20% back for payroll in 30 days) and their risk limits.", reveals: "payroll", tag: "question" },
          { q: "ok", label: "Send a standard rate card." },
          { q: "poor", label: "Propose equities for a higher return." },
        ] },
        { prompt: "Proposal and onboarding?", options: [
          { q: "best", label: "Ladder it: money market for the payroll portion, plus 91-day T-bills/CP for the rest. Request the board resolution, mandate and corporate KYC before funding.", reveals: "board", value: true },
          { q: "poor", label: "Accept the funds now. Paperwork can follow.", compliance: -20 },
          { q: "ok", label: "Put it all in a 91-day bill." },
        ] },
      ], growth: "Recurring treasury mandate" },
  ];

  const TITLE_FOR = (first, last, gender, tier, age, group) => {
    if (tier === "corporate") return `${first} ${last}`;
    if (age >= 55) {
      const senior = group === "hausa" ? (gender === "m" ? ["Alhaji", "Mallam", "Engr.", "Dr"] : ["Hajia", "Mrs", "Dr (Mrs)"]) : (gender === "m" ? ["Chief", "Mr", "Engr.", "Prof."] : ["Mrs", "Chief (Mrs)", "Dr (Mrs)", "Lady"]);
      return pick(senior) + " " + last;
    }
    return (gender === "m" ? pick(["Mr", "Mr", "Dr", "Barr."]) : pick(["Ms", "Mrs", "Dr"])) + " " + last;
  };

  /* Generate one contact. opts: { units: ["cx","wealth","invest"], minC, maxC, arrival } */
  function generateClient(opts = {}) {
    const units = opts.units || ["cx", "wealth", "invest"];
    for (let tries = 0; tries < 60; tries++) {
      // Where is the client? ~75% Nigeria, ~15% diaspora, ~10% international
      const r = Math.random(), origin = r < 0.75 ? "ng" : r < 0.9 ? "diaspora" : "global";
      const loc = pick(LOCATIONS[origin]);
      const pool = CASES.filter((c) => units.includes(c.unit) && (c.origins ? c.origins.includes(origin) : origin !== "global" || c.unit !== "cx" || c.base >= 2));
      if (!pool.length) continue;
      const cs = pick(pool);
      const chans = cs.channels.filter((c) => origin === "ng" || c !== "walkin");
      if (!chans.length) continue;
      const channel = pick(chans);
      const tierPool = ["mass", "mass", "affluent", "affluent", "hni", cs.unit === "invest" ? "corporate" : "affluent"].filter((t) => !cs.tiers || cs.tiers.includes(t));
      const tierId = cs.id === "treasury" || cs.id === "fpi" ? "corporate" : cs.id === "legacy" ? "hni" : pick(tierPool.length ? tierPool : cs.tiers);
      const tier = TIERS[tierId];
      const moodId = cs.kind === "issue" ? pick(["anxious", "irritated", "irritated", "angry", "calm"]) : pick(["calm", "calm", "anxious", "irritated"]);
      const mood = MOODS[moodId], ch = CHANNELS[channel];
      const complexity = Math.max(1, Math.min(5, cs.base + (tier.cx >= 2 ? 1 : 0) + (mood.cx >= 2 ? 1 : 0) + (ch.cx || 0) + (origin !== "ng" ? 1 : 0) - (cs.base >= 4 ? 1 : 0)));
      if (opts.minC && complexity < opts.minC) continue;
      if (opts.maxC && complexity > opts.maxC) continue;
      const style = pick(Object.keys(C.styles));
      const group = origin === "global" ? "global" : loc.names && loc.names !== "any" ? loc.names : pick(["yoruba", "igbo", "hausa", "southsouth"]);
      const gender = pick(["f", "m"]);
      const first = pick(NAMES[group][gender]), last = pick(NAMES[group].s);
      const age = tierId === "mass" ? rint(22, 60) : tierId === "affluent" ? rint(28, 62) : rint(40, 72);
      const amount = rint(tier.value[0] / 1000, tier.value[1] / 1000) * 1000;
      // Clients abroad talk in US dollars (illustrative conversion for the sim only)
      const usd = amount / 1500;
      const amountText = origin === "ng" ? fmt(amount) : "$" + (usd >= 1e6 ? +(usd / 1e6).toFixed(1) + "m" : Math.max(1, Math.round(usd / 1000)) + "k");
      const title = origin === "global" ? (gender === "m" ? "Mr " : "Ms ") + last : TITLE_FOR(first, last, gender, tierId, age, group);
      const org = tierId === "corporate"
        ? (origin === "global" ? pick(["Harbour Frontier Fund", "Savanna Capital LLP", "Baobab Partners", "Kilimanjaro Asset Mgmt"]) : pick(["Lekki Foods Plc", "Sahel Logistics Ltd", "Eko Paints Ltd", "Crestview Hospitals", "Niger Delta Cement Co.", "Hope Foundation"]))
        : null;
      const where = origin === "ng" ? `${loc.city}, ${loc.region}` : `${loc.city}, ${loc.country}`;
      const diff = loc.tz - 1; // Lagos is UTC+1 (no daylight saving considered)
      const tzNote = origin === "ng" ? null : diff === 0 ? "Same time as Lagos" : `${Math.abs(diff)}h ${diff > 0 ? "ahead of" : "behind"} Lagos`;
      return {
        uid: Math.random().toString(36).slice(2, 9),
        caseId: cs.id, unit: cs.unit, title: cs.title, kind: cs.kind,
        origin, originLabel: ORIGIN_LABEL[origin], where, tzNote,
        name: `${first} ${last}`, address: org ? first : title,
        org, gender, age, occupation: org ? `${pick(tier.occupations)}, ${org}` : pick(tier.occupations) + (origin === "diaspora" ? " (diaspora)" : ""),
        tierId, tier, moodId, mood, channel, ch, style, cue: pick(STYLE_CUES[style]),
        complexity, amount, amountText,
        msg: cs.msg.replace("{amt}", amountText),
        needs: cs.needs, stages: cs.stages, growth: cs.growth || null,
        startTrust: Math.max(5, Math.min(90, 50 + mood.trust + ch.trust - (complexity - 1) * 2)),
        arrival: opts.arrival ?? 0,
        avatar: org ? "🏢" : pick(gender === "f" ? ["👩🏾", "👩🏽", "🧕🏾", "👩🏿", "👵🏾"] : ["👨🏾", "👨🏽", "👳🏾‍♂️", "👨🏿", "👴🏾"]),
      };
    }
    return null;
  }

  /* Build a shift queue: n contacts arriving over `minutes` */
  function generateShift(n, opts = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = generateClient({ ...opts, arrival: i === 0 ? 0 : rint(0, opts.minutes || 180) });
      if (c) out.push(c);
    }
    return out.sort((a, b) => a.arrival - b.arrival);
  }

  Object.assign(C, {
    clientGen: { CASES, CHANNELS, TIERS, MOODS, LOCATIONS, OPENERS, CLOSERS, ABRUPT, STYLE_CUES, generateClient, generateShift, fmt },
  });
})();
