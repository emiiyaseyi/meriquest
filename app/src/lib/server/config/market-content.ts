/** The starting practice market. Every name, price and yield is fictional. Admins can change instruments, states and the calendar under Settings. */
export const DEFAULT_MARKET = {
  settings: {
    /** Practice cash by growth level: a person gets the band for the level they are at the first time they open My Portfolio. */
    startBands: [
      { fromLevel: 0, cash: 1_000_000 },
      { fromLevel: 2, cash: 5_000_000 },
      { fromLevel: 4, cash: 10_000_000 },
    ],
    /** Fee on every practice trade, in percent of the amount. */
    feePct: 0.5,
    /** Trades one person may make each day. */
    tradesPerDay: 10,
    /** Minutes a holding must be kept before it can be sold (a personal-dealing holding period). 0 switches it off. */
    holdingMinutes: 30,
    /** How often prices change, and how many recent ticks shape a price. */
    tickMinutes: 30,
    windowTicks: 96,
    defaultState: "calm",
  },
  kinds: [
    { id: "equity", label: "Shares", icon: "📈" },
    { id: "bond", label: "Bonds", icon: "🏛️" },
    { id: "bill", label: "Treasury bills", icon: "🧾" },
    { id: "money", label: "Money market", icon: "💵" },
    { id: "fund", label: "Funds", icon: "🧺" },
  ],
  instruments: [
    { id: "lagoon-breweries", name: "Lagoon Breweries", kind: "equity", price: 42.5, volatility: 0.9, incomePct: 6 },
    { id: "harbour-bank", name: "Harbour Bank", kind: "equity", price: 28.2, volatility: 0.8, incomePct: 8 },
    { id: "eko-cement", name: "Eko Cement", kind: "equity", price: 215, volatility: 0.7, incomePct: 5 },
    { id: "savanna-foods", name: "Savanna Foods", kind: "equity", price: 19.6, volatility: 1, incomePct: 4 },
    { id: "tidewater-telecom", name: "Tidewater Telecom", kind: "equity", price: 310, volatility: 0.8, incomePct: 5, restricted: "Restricted: the Group is advising on a deal involving this company, so staff may not deal in it." },
    { id: "fgn-2031", name: "Practice Federal Bond 2031", kind: "bond", price: 1000, volatility: 0.12, incomePct: 14 },
    { id: "fgn-2035", name: "Practice Federal Bond 2035", kind: "bond", price: 1000, volatility: 0.18, incomePct: 15.5 },
    { id: "corp-bond", name: "Harbour Corporate Bond 2029", kind: "bond", price: 1000, volatility: 0.2, incomePct: 17 },
    { id: "tbill-91", name: "Practice Treasury Bill 91-day", kind: "bill", price: 1000, volatility: 0.02, incomePct: 15 },
    { id: "tbill-364", name: "Practice Treasury Bill 364-day", kind: "bill", price: 1000, volatility: 0.03, incomePct: 18 },
    { id: "money-fund", name: "Practice Money Market Fund", kind: "money", price: 100, volatility: 0.01, incomePct: 16 },
    { id: "balanced-fund", name: "Practice Balanced Fund", kind: "fund", price: 100, volatility: 0.35, incomePct: 11 },
    { id: "equity-fund", name: "Practice Equity Fund", kind: "fund", price: 100, volatility: 0.6, incomePct: 9 },
    { id: "sukuk", name: "Practice Sukuk 2030", kind: "bond", price: 1000, volatility: 0.15, incomePct: 13 },
  ],
  states: <{ id: string; label: string; icon: string; drift: Record<string, number> }[]>[
    { id: "calm", label: "Calm market", icon: "🌤️", drift: {} },
    { id: "rally", label: "Rally", icon: "🚀", drift: { equity: 0.15, fund: 0.08 } },
    { id: "selloff", label: "Sell-off", icon: "📉", drift: { equity: -0.2, fund: -0.1, bond: 0.02 } },
    { id: "rate-shock", label: "Rate shock", icon: "⚡", drift: { bond: -0.12, equity: -0.1, fund: -0.06, bill: 0.02 } },
  ],
  /** Planned states, for example a rate-hike week. Dates are YYYY-MM-DD. Empty by default. */
  schedule: [] as { state: string; from: string; to: string }[],
};
