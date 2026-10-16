/**
 * The starting Client Desk. All clients and amounts are fictional. Admins can change everything under Settings, including how
 * many clients each unit is offered a day. Clients differ: some need a short chat, some onboarding, a presentation or several rounds of
 * convincing, some ask for something improper, and some will never invest however well they are served.
 */
type Opt = [id: string, text: string, tags: string[]];
const step = (id: string, prompt: string, options: Opt[], recommend = false) => ({ id, prompt, recommend, options: options.map(([oid, text, tags]) => ({ id: oid, text, tags })) });

const SHORT = ["meet", "recommend", "close"];
const SIMPLE = ["meet", "understand", "recommend", "close"];
const ONBOARD = ["meet", "onboard-docs", "onboard-profile", "understand", "recommend", "onboard-open", "close"];
const UPSET = ["meet", "complaint-own", "close"];
const PRICE = ["meet", "understand", "recommend", "objection-price", "convince-again", "close"];
const TRUST = ["meet", "understand", "recommend", "objection-trust", "close"];
const PRESENT = ["meet", "understand", "present-prep", "present-qa", "recommend", "close"];
const CORPORATE = ["meet", "onboard-docs", "present-prep", "present-qa", "understand", "recommend", "objection-compare", "close"];
const IMPROPER = ["meet", "understand", "ask-improper", "recommend", "close"];
const LONG = ["meet", "understand", "recommend", "objection-compare", "convince-again", "objection-price", "convince-again", "close"];

interface Template {
  key: string;
  archetype: string;
  flow: string[];
  units: string[];
  suitable: string[];
  kyc: boolean;
  tenure: number;
  resistance: number;
  type?: "corporate";
  ask?: string;
  story: (name: string, amount: string) => string;
  people: [name: string, amount: string][];
}

const TEMPLATES: Template[] = [
  { key: "saver", archetype: "many-questions", flow: SIMPLE, units: ["cx"], suitable: ["money", "bill"], kyc: false, tenure: 0, resistance: 5, story: (n, a) => `${n} has ₦${a} saved for a medical bill within a year. They ask many questions and have never invested.`, people: [["Mrs Esther Adeyemi", "400,000"], ["Mr Bayo Fashola", "250,000"], ["Mrs Kemi Oyebanji", "600,000"]] },
  { key: "quick", archetype: "impatient", flow: SHORT, units: ["cx"], suitable: ["bill", "money", "bond"], kyc: false, tenure: 0, resistance: 0, story: (n, a) => `${n} has ten minutes and ₦${a} for six months. They want a clear answer, not an interview.`, people: [["Mr Kunle Bakare", "2,000,000"], ["Ms Ronke Alade", "1,500,000"], ["Mr Idris Yusuf", "3,000,000"]] },
  { key: "newcomer", archetype: "first-timer", flow: ONBOARD, units: ["cx"], suitable: ["money", "bill", "fund"], kyc: true, tenure: 0, resistance: 10, story: (n, a) => `${n} is a new client with a first ₦${a}, saving for a deposit in two years. Their documents show an old address and the account must be opened today.`, people: [["Ms Amaka Obi", "150,000"], ["Mr Tobi Adewale", "200,000"], ["Ms Zainab Lawal", "320,000"]] },
  { key: "upset", archetype: "upset", flow: UPSET, units: ["cx"], suitable: ["money"], kyc: false, tenure: 0, resistance: 0, story: (n) => `${n}'s statement was wrong twice and nobody called back. They want to be heard and are thinking of leaving.`, people: [["Mr Femi Lawal", "900,000"], ["Mrs Titi Balogun", "1,100,000"], ["Mr Chuka Nwosu", "750,000"]] },
  { key: "split", archetype: "bender", flow: IMPROPER, units: ["cx"], suitable: ["money", "bill"], kyc: false, tenure: 0, resistance: 10, ask: "asks you to split a large cash deposit into smaller ones so it is not reported.", story: (n, a) => `${n} arrives with ₦${a} in cash and a favour to ask.`, people: [["Mr Dele Ogunbanjo", "9,500,000"], ["Mr Yinka Sodipo", "7,200,000"], ["Mrs Nneka Okoro", "8,400,000"]] },

  { key: "compare", archetype: "price-sensitive", flow: PRICE, units: ["*"], suitable: ["fund", "bond", "money"], kyc: false, tenure: 0, resistance: 15, story: (n, a) => `${n} has ₦${a} and is comparing three firms. Every naira of fees matters.`, people: [["Dr Bisi Coker", "8,000,000"], ["Ms Lola Danjuma", "1,200,000"], ["Mr Sam Ekong", "4,500,000"]] },
  { key: "backdate", archetype: "bender", flow: IMPROPER, units: ["*"], suitable: ["fund", "money", "bill"], kyc: false, tenure: 0, resistance: 10, ask: "asks you to backdate the account form so it shows last month.", story: (n, a) => `${n} wants to invest ₦${a} and says everyone at his last broker 'sorted these things quickly'.`, people: [["Mr Wale Adegoke", "2,500,000"], ["Mrs Folake Dosunmu", "3,800,000"], ["Mr Ahmed Bello", "5,000,000"]] },
  { key: "browser", archetype: "browser", flow: PRICE, units: ["*"], suitable: ["money", "bill", "fund"], kyc: false, tenure: 0, resistance: 100, story: (n) => `${n} is 'just looking', asks for rates from five firms and has no plan to invest this year.`, people: [["Mr Gbenga Olu", "0"], ["Ms Hauwa Sani", "0"], ["Mr Emeka Obiora", "0"]] },
  { key: "gift", archetype: "bender", flow: IMPROPER, units: ["*"], suitable: ["fund", "bond"], kyc: false, tenure: 0, resistance: 5, ask: "offers you an expensive watch if you give his orders priority.", story: (n, a) => `${n} is a grateful client with ₦${a} invested who wants 'special treatment'.`, people: [["Chief Dayo Akande", "20,000,000"], ["Alhaji Sule Danladi", "15,000,000"], ["Mrs Bola Tinubu-Cole", "12,000,000"]] },

  { key: "widow", archetype: "anxious", flow: TRUST, units: ["wealth"], suitable: ["bond", "bill", "money"], kyc: false, tenure: 0, resistance: 20, story: (n, a) => `${n} received ₦${a} from a late husband's estate. They fear losing it and ask, 'Why should I trust you?'`, people: [["Mrs Ngozi Eze", "12,000,000"], ["Mrs Hadiza Umar", "9,000,000"], ["Mrs Funmi Alabi", "15,000,000"]] },
  { key: "present-w", archetype: "big-quiet", flow: PRESENT, units: ["wealth"], suitable: ["equity", "fund"], kyc: false, tenure: 1, resistance: 15, story: (n, a) => `${n} has ₦${a} for ten years and asks for a presentation before deciding. They say little and notice everything.`, people: [["Mr Tunde Ajayi", "60,000,000"], ["Mr Kayode Fadipe", "45,000,000"], ["Dr Uche Nwankwo", "80,000,000"]] },
  { key: "long-haul", archetype: "price-sensitive", flow: LONG, units: ["wealth"], suitable: ["fund", "bond"], kyc: false, tenure: 1, resistance: 30, story: (n, a) => `${n} has ₦${a} and takes a long time to decide. They compare, ask again and need a lot of patience.`, people: [["Mr Yemi Salako", "5,000,000"], ["Mrs Nike Adebanjo", "7,500,000"], ["Mr Ibrahim Waziri", "6,000,000"]] },
  { key: "school", archetype: "many-questions", flow: ONBOARD, units: ["wealth"], suitable: ["fund", "bond", "bill"], kyc: true, tenure: 0, resistance: 15, story: (n, a) => `${n} is a new client with ₦${a} and school fees due in four years. Onboarding must be done properly.`, people: [["Mr Segun Alao", "3,000,000"], ["Mrs Ireti Adio", "2,200,000"], ["Mr Paul Ekanem", "4,000,000"]] },

  { key: "committee", archetype: "committee", flow: CORPORATE, units: ["invest", "wealth"], suitable: ["bond", "bill", "money"], kyc: true, tenure: 3, resistance: 10, type: "corporate", story: (n, a) => `${n} has ₦${a} of member savings. The committee wants documents, due diligence, a presentation and a written record.`, people: [["Harbour Staff Cooperative", "250,000,000"], ["Eko Cement Treasury", "900,000,000"], ["Savanna Foods Provident Society", "420,000,000"]] },
  { key: "tip", archetype: "bender", flow: IMPROPER, units: ["invest"], suitable: ["fund", "equity"], kyc: false, tenure: 1, resistance: 5, ask: "asks which company the firm will say good news about next week, so he can buy first.", story: (n, a) => `${n} has ₦${a} and says, 'You people always know before everyone else.'`, people: [["Mr Segun Ola", "3,000,000"], ["Mr Rotimi Cole", "6,500,000"], ["Mr Jide Okafor", "2,800,000"]] },
  { key: "present-i", archetype: "big-quiet", flow: PRESENT, units: ["invest"], suitable: ["equity", "bond", "fund"], kyc: false, tenure: 2, resistance: 20, type: "corporate", story: (n, a) => `${n} has ₦${a} and long horizons. They ask for a presentation and few questions, and expect precision.`, people: [["Delta Family Office", "1,500,000,000"], ["Lagoon Endowment Fund", "800,000,000"], ["Niger Basin Foundation", "650,000,000"]] },
  { key: "doubt", archetype: "anxious", flow: TRUST, units: ["invest", "*"], suitable: ["bond", "money", "bill"], kyc: false, tenure: 0, resistance: 25, story: (n, a) => `${n} is a first-time investor after a market fall with ₦${a}, who asks, 'Can I lose it all?'`, people: [["Alhaji Musa Garba", "2,500,000"], ["Mrs Peju Alli", "1,800,000"], ["Mr Tola Brown", "3,200,000"]] },
];

import { AFTERMATH } from "./clients-aftermath";

export const DEFAULT_CLIENTS = {
  aftermath: AFTERMATH,
  settings: {
    /** Clients offered a day to a unit that is not listed below. */
    perDay: 10,
    /** Clients offered a day, by unit: customer experience handles many quick conversations; advisors handle fewer, longer ones. */
    perDayByUnit: { cx: 10, wealth: 15, invest: 15 } as Record<string, number>,
    pointsGreat: 3,
    pointsGood: 2,
    pointsLearning: 0,
    /** Bonus when the client goes ahead and invests. */
    pointsInvest: 2,
  },
  rules: {
    baseScore: 40,
    tagWeights: {
      rapport: 6, discover: 8, suitability: 8, kyc: 8, fees: 6, clarity: 6, followup: 8, "risk-disclosure": 8, thorough: 6, controls: 8, prepared: 8, honesty: 8, teamwork: 4, trust: 8, patience: 8, decline: 16, escalate: 8, ownership: 10,
      pitch: -6, rush: -10, pressure: -12, promise: -20, offschedule: -14, unprepared: -10, bluff: -12, badmouth: -10, defend: -8, passon: -8, abandon: -8, improper: -30, guess: -8, rigged: -16, skipkyc: -14, bypass: -14,
    } as Record<string, number>,
    breachTags: {
      promise: "Promised returns, which is never allowed.",
      improper: "Did something improper because the client asked.",
      offschedule: "Offered a discount outside the approved fee schedule.",
      skipkyc: "Opened an account before collecting the documents.",
      guess: "Filled in the risk profile without the client.",
      rigged: "Rigged the risk profile to fit a product.",
      bypass: "Activated an account without the checker's approval.",
      bluff: "Gave an answer as fact when you were not sure.",
    } as Record<string, string>,
    suitableBonus: 20,
    unsuitablePenalty: 25,
    randomness: 8,
    greatScore: 85,
    goodScore: 70,
    okScore: 55,
  },
  archetypes: [
    { id: "many-questions", label: "Many questions, invests little", icon: "❓", trait: "Asks about everything and decides slowly. Needs clear, patient answers.", tagWeights: { discover: 4, clarity: 6, rush: -6 } as Record<string, number> },
    { id: "big-quiet", label: "Few questions, invests large", icon: "🤫", trait: "Says little but moves large amounts. Values accuracy and respect for their time.", tagWeights: { suitability: 4, "risk-disclosure": 4, prepared: 6, pitch: -4 } as Record<string, number> },
    { id: "price-sensitive", label: "Price-sensitive", icon: "💸", trait: "Compares every fee. Wants to see the cost laid out plainly.", tagWeights: { fees: 10, offschedule: -4 } as Record<string, number> },
    { id: "anxious", label: "Anxious", icon: "😟", trait: "Worried about losing money. Needs reassurance that is honest, not a promise.", tagWeights: { rapport: 6, "risk-disclosure": 6, trust: 6, promise: -6 } as Record<string, number> },
    { id: "impatient", label: "Impatient", icon: "⏱️", trait: "Short of time. Wants a clear answer without a long interview.", tagWeights: { discover: -2, rush: 4, clarity: 6 } as Record<string, number> },
    { id: "first-timer", label: "First-time investor", icon: "🌱", trait: "New to investing. Needs plain words and a gentle start.", tagWeights: { clarity: 8, suitability: 4, thorough: 4, pitch: -4 } as Record<string, number> },
    { id: "upset", label: "Upset", icon: "😠", trait: "Had a poor experience. Wants to be heard before anything else.", tagWeights: { rapport: 10, ownership: 6, pressure: -6 } as Record<string, number> },
    { id: "committee", label: "Committee-driven (corporate)", icon: "🏢", trait: "Needs documents, due diligence and a written record for the committee.", tagWeights: { kyc: 6, followup: 8, "risk-disclosure": 4, prepared: 6 } as Record<string, number> },
    { id: "bender", label: "Bends the rules", icon: "🕴️", trait: "Charming and persuasive, and asks for something you should not do. The right answer is a polite no.", tagWeights: { decline: 6, escalate: 6 } as Record<string, number> },
    { id: "browser", label: "Just looking", icon: "👀", trait: "Collects quotes and does not plan to invest. Serve them well anyway; they may remember you.", tagWeights: { patience: 4, clarity: 4 } as Record<string, number> },
  ],
  steps: [
    step("meet", "{name} arrives. How do you start?", [
      ["greet-listen", "Greet them warmly and let them explain what they need.", ["rapport", "discover"]],
      ["straight-pitch", "Go straight to the product you like best.", ["pitch"]],
      ["check-docs", "Welcome them, then confirm ID and documents first.", ["kyc", "rapport"]],
    ]),
    step("understand", "How do you find out what suits {name}?", [
      ["ask-goals", "Ask about goals, time horizon and comfort with risk.", ["discover", "suitability"]],
      ["explain-fees", "Explain our fees and how the products work in plain words.", ["fees", "clarity"]],
      ["skip-questions", "Skip the questions; there is not much time.", ["rush"]],
    ]),
    step("recommend", "What do you recommend to {name}?", [], true),
    step("close", "How do you close the conversation with {name}?", [
      ["written-follow", "Confirm the advice in writing, explain the risks and agree a follow-up date.", ["followup", "risk-disclosure"]],
      ["promise-returns", "Promise strong returns to win the account.", ["promise"]],
      ["push-more", "Ask them to invest more today.", ["pressure"]],
    ]),
    step("onboard-docs", "Onboarding {name}: which documents do you collect?", [
      ["full-kyc", "Collect a valid ID, proof of address, tax ID and the source of funds, and check them against the originals.", ["kyc", "thorough"]],
      ["basic-id", "Take a copy of an ID and move on.", ["rush"]],
      ["docs-later", "Open first and collect the documents later.", ["skipkyc"]],
    ]),
    step("onboard-profile", "Complete the risk profile and suitability form for {name}.", [
      ["profile-together", "Go through each question together and record the answers honestly.", ["suitability", "discover", "thorough"]],
      ["profile-fill", "Fill it in yourself to save time.", ["guess"]],
      ["profile-sell", "Tick the boxes that fit the product you want to sell.", ["rigged"]],
    ]),
    step("onboard-open", "Open the account for {name}.", [
      ["submit-review", "Submit the complete file for the checker's approval and tell the client when to expect activation.", ["controls", "followup"]],
      ["open-now", "Activate the account yourself straight away.", ["bypass"]],
    ]),
    step("present-prep", "{name} asks for a presentation. How do you prepare?", [
      ["tailored-deck", "Build a short deck around their goals, with the risks and fees stated plainly.", ["prepared", "clarity", "risk-disclosure"]],
      ["generic-deck", "Send the standard brochure.", ["pitch"]],
      ["wing-it", "Wing it; you know the products.", ["unprepared"]],
    ]),
    step("present-qa", "In the presentation {name} asks a hard question you cannot fully answer.", [
      ["honest-follow", "Say what you know, say what you do not, and promise a written answer by an agreed date.", ["honesty", "followup"]],
      ["bluff-answer", "Give a confident answer anyway.", ["bluff"]],
      ["bring-specialist", "Bring in the product specialist.", ["honesty", "teamwork"]],
    ]),
    step("objection-price", "{name} says your fees are too high.", [
      ["explain-value", "Show the approved fee schedule and what the client receives for it.", ["fees", "clarity"]],
      ["secret-discount", "Offer a private discount outside the schedule.", ["offschedule"]],
      ["push-through", "Say they will not find better and press for a decision.", ["pressure"]],
    ]),
    step("objection-trust", "{name} asks, 'Why should I trust you with my money?'", [
      ["show-credentials", "Explain how the firm is regulated and how client assets are safeguarded, and offer references.", ["trust", "clarity", "honesty"]],
      ["guarantee", "Promise they will not lose a kobo.", ["promise"]],
      ["be-offended", "Say you are insulted by the question.", ["defend"]],
    ]),
    step("objection-compare", "{name} compares you with a competitor.", [
      ["fair-compare", "Compare fairly on cost, service and risk, and admit where the other offer is stronger.", ["fees", "honesty", "clarity"]],
      ["run-down", "Run the competitor down.", ["badmouth"]],
      ["match-claim", "Match their claim without checking it.", ["bluff"]],
    ]),
    step("convince-again", "{name} is still unsure. What now?", [
      ["give-time", "Send a short written summary, give them time and agree a follow-up call.", ["patience", "followup"]],
      ["push-now", "Push for a decision today.", ["pressure"]],
      ["drop-them", "Move on; they are wasting your time.", ["abandon"]],
    ]),
    step("ask-improper", "{name} {ask}", [
      ["decline-escalate", "Politely decline, explain why, and tell Compliance.", ["decline", "escalate", "honesty"]],
      ["decline-only", "Politely decline and say nothing more.", ["decline"]],
      ["go-along", "Do it; it keeps the client happy.", ["improper"]],
      ["delay-do", "Say you will 'see what you can do' and do it later.", ["improper", "bluff"]],
    ]),
    step("complaint-own", "{name} is upset. How do you handle the complaint?", [
      ["own-fix", "Listen fully, apologise, own it, fix what you can and log the complaint.", ["rapport", "ownership", "followup"]],
      ["defend-firm", "Explain why the firm was right.", ["defend"]],
      ["pass-on", "Pass them to another desk.", ["passon"]],
    ]),
  ],
  clients: TEMPLATES.flatMap((t) =>
    t.people.map(([name, amount], i) => ({
      id: `c-${t.key}-${i + 1}`,
      units: t.units,
      name,
      type: t.type ?? ("individual" as "individual" | "corporate"),
      archetype: t.archetype,
      story: t.story(name, amount),
      flow: t.flow,
      ask: t.ask ?? "",
      suitable: t.suitable,
      kycRequired: t.kyc,
      resistance: t.resistance,
      minTenure: t.tenure,
    })),
  ),
};
