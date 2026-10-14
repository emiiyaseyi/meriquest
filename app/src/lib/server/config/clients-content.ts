/** The starting Client Desk. All clients and amounts are fictional. Admins can change everything under Settings. */
const step = (id: string, prompt: string, options: { id: string; text: string; tags: string[] }[], recommend = false) => ({ id, prompt, recommend, options });
const cl = (id: string, units: string[], name: string, type: "individual" | "corporate", archetype: string, story: string, suitable: string[], kycRequired = false, minTenure = 0) => ({ id, units, name, type, archetype, story, suitable, kycRequired, minTenure });

export const DEFAULT_CLIENTS = {
  settings: { perDay: 3, pointsGreat: 8, pointsGood: 5, pointsLearning: 1 },
  rules: {
    baseScore: 40,
    tagWeights: { rapport: 6, discover: 8, suitability: 8, kyc: 8, fees: 6, clarity: 6, followup: 8, "risk-disclosure": 8, pitch: -6, rush: -10, pressure: -12, promise: -20 },
    suitableBonus: 20,
    unsuitablePenalty: 25,
    randomness: 8,
    greatScore: 85,
    goodScore: 70,
    okScore: 55,
  },
  archetypes: [
    { id: "many-questions", label: "Many questions, invests little", icon: "❓", trait: "Asks about everything and decides slowly. Needs clear, patient answers.", tagWeights: { discover: 4, clarity: 6, rush: -6 } },
    { id: "big-quiet", label: "Few questions, invests large", icon: "🤫", trait: "Says little but moves large amounts. Values accuracy and respect for their time.", tagWeights: { suitability: 4, "risk-disclosure": 4, pitch: -4 } },
    { id: "price-sensitive", label: "Price-sensitive", icon: "💸", trait: "Compares every fee. Wants to see the cost laid out plainly.", tagWeights: { fees: 10 } },
    { id: "anxious", label: "Anxious", icon: "😟", trait: "Worried about losing money. Needs reassurance that is honest, not a promise.", tagWeights: { rapport: 6, "risk-disclosure": 6, promise: -6 } },
    { id: "impatient", label: "Impatient", icon: "⏱️", trait: "Short of time. Wants a clear answer without a long interview.", tagWeights: { discover: -2, rush: 4, clarity: 6 } },
    { id: "first-timer", label: "First-time investor", icon: "🌱", trait: "New to investing. Needs plain words and a gentle start.", tagWeights: { clarity: 8, suitability: 4, pitch: -4 } },
    { id: "upset", label: "Upset", icon: "😠", trait: "Had a poor experience. Wants to be heard before anything else.", tagWeights: { rapport: 10, pressure: -6 } },
    { id: "committee", label: "Committee-driven (corporate)", icon: "🏢", trait: "Needs documents, due diligence and a written record for the committee.", tagWeights: { kyc: 6, followup: 8, "risk-disclosure": 4 } },
  ],
  steps: [
    step("meet", "The client arrives. How do you start?", [
      { id: "greet-listen", text: "Greet them warmly and let them explain what they need.", tags: ["rapport", "discover"] },
      { id: "straight-pitch", text: "Go straight to the product you like best.", tags: ["pitch"] },
      { id: "check-docs", text: "Welcome them, then confirm ID and documents first.", tags: ["kyc", "rapport"] },
    ]),
    step("understand", "How do you find out what suits them?", [
      { id: "ask-goals", text: "Ask about goals, time horizon and comfort with risk.", tags: ["discover", "suitability"] },
      { id: "explain-fees", text: "Explain our fees and how the products work in plain words.", tags: ["fees", "clarity"] },
      { id: "skip-questions", text: "Skip the questions; there is not much time.", tags: ["rush"] },
    ]),
    step("recommend", "What do you recommend?", [], true),
    step("close", "How do you close the conversation?", [
      { id: "written-follow", text: "Confirm the advice in writing, explain the risks and agree a follow-up date.", tags: ["followup", "risk-disclosure"] },
      { id: "promise-returns", text: "Promise strong returns to win the account.", tags: ["promise"] },
      { id: "push-more", text: "Ask them to invest more today.", tags: ["pressure"] },
    ]),
  ],
  clients: [
    cl("c-esther", ["cx", "*"], "Mrs Esther Adeyemi", "individual", "many-questions", "A retired teacher with ₦400,000 she may need for medical bills within a year. She has many questions and has never invested.", ["money", "bill"]),
    cl("c-kunle", ["cx", "*"], "Mr Kunle Bakare", "individual", "impatient", "A busy trader with ₦2,000,000 for six months. He has ten minutes and wants a clear answer.", ["bill", "money", "bond"]),
    cl("c-amaka", ["cx", "*"], "Ms Amaka Obi", "individual", "first-timer", "A young engineer with her first ₦150,000, saving for a deposit in about two years. Her documents show an old address.", ["money", "bill", "fund"], true),
    cl("c-femi", ["cx", "*"], "Mr Femi Lawal", "individual", "upset", "A client whose statement was wrong twice. He wants his ₦900,000 moved and is angry.", ["money", "bill"]),
    cl("c-ngozi", ["wealth", "*"], "Mrs Ngozi Eze", "individual", "anxious", "A widow with ₦12,000,000 from her late husband's estate. She fears losing it and wants steady income.", ["bond", "bill", "money"], false, 1),
    cl("c-tunde", ["wealth", "*"], "Mr Tunde Ajayi", "individual", "big-quiet", "A quiet businessman with ₦60,000,000 for ten years. He wants growth and has a high tolerance for risk.", ["equity", "fund"], false, 2),
    cl("c-bisi", ["wealth", "*"], "Dr Bisi Coker", "individual", "price-sensitive", "A doctor with ₦8,000,000 comparing three firms. Every naira of fees matters to her.", ["fund", "bond", "money"], false, 1),
    cl("c-yemi", ["wealth", "*"], "Mr Yemi Salako", "individual", "many-questions", "A mid-career manager with ₦5,000,000 and a goal of school fees in four years.", ["fund", "bond", "bill"], true, 1),
    cl("c-harbour-coop", ["wealth", "invest"], "Harbour Staff Cooperative", "corporate", "committee", "A cooperative with ₦250,000,000 of member savings. The committee wants safe, documented options and a written record.", ["bond", "bill", "money"], true, 3),
    cl("c-eko-treasury", ["invest", "wealth"], "Eko Cement Treasury", "corporate", "committee", "A treasury team with ₦900,000,000 of surplus cash for under a year. They need liquidity and a clear risk note.", ["bill", "money"], true, 3),
    cl("c-delta-family", ["invest", "wealth"], "Delta Family Office", "corporate", "big-quiet", "A family office with ₦1,500,000,000 and a long horizon. They ask few questions and expect precision.", ["equity", "bond", "fund"], false, 4),
    cl("c-segun", ["invest", "*"], "Mr Segun Ola", "individual", "impatient", "A fund manager's friend wants a quick view on a share tip he heard at a wedding, for ₦3,000,000.", ["fund", "equity"], false, 1),
    cl("c-lola", ["invest", "*"], "Ms Lola Danjuma", "individual", "price-sensitive", "A young professional with ₦1,200,000 who found a cheaper broker online.", ["fund", "bond", "money"]),
    cl("c-musa", ["*"], "Alhaji Musa Garba", "individual", "anxious", "A first-time investor after a market fall. He has ₦2,500,000 and asks, 'Can I lose it all?'", ["bond", "money", "bill"]),
  ],
};
