/** The starting Compliance Desk rules. Admins can change everything under Settings. All amounts are practice naira. */
export const DEFAULT_COMPLIANCE = {
  settings: {
    /** When on, a practice trade needs an approved pre-clearance from the desk first (personal dealing rule). */
    requirePreclearance: false,
    /** Hours an approved pre-clearance stays valid. */
    preclearHours: 24,
    /** The most the desk will approve for one personal deal. */
    maxDealValue: 5_000_000,
    /** Gifts and meals up to this value are recorded and may be accepted. */
    giftRecordLimit: 25_000,
    /** Above the record limit and up to this value, wait for Compliance approval; above it, decline. */
    giftDeclineLimit: 100_000,
    /** How many entries each register keeps. */
    keep: 25,
  },
  giftKinds: [
    { id: "gift", label: "Gift", icon: "🎁" },
    { id: "meal", label: "Meal or entertainment", icon: "🍽️" },
    { id: "tickets", label: "Event tickets", icon: "🎟️" },
    { id: "travel", label: "Travel or hotel", icon: "✈️" },
    { id: "cash", label: "Cash or voucher", icon: "💵" },
  ],
};
