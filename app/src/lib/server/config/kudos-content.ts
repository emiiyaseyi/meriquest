/** The starting Kudos settings. Kudos is a thank-you between colleagues, never a transfer: the giver keeps all their Merit points. Admins can change everything under Settings. */
export const DEFAULT_KUDOS = {
  settings: {
    /** Kudos one person may give each day. */
    perDay: 3,
    /** Merit points the receiver is awarded by the game for each kudos (0 switches it off). The giver pays nothing. */
    receiverPoints: 2,
    /** The most Merit points one person can receive from kudos in a day. */
    receiverDailyCap: 6,
    /** Longest note that may go with a kudos. */
    maxNote: 120,
    /** How many received kudos are kept on a person's list. */
    keep: 30,
  },
  values: [
    { id: "team-player", label: "Team player", icon: "🤝" },
    { id: "great-help", label: "Great help", icon: "🙌" },
    { id: "client-hero", label: "Client hero", icon: "🦸" },
    { id: "kept-me-calm", label: "Kept me calm", icon: "🌿" },
    { id: "integrity", label: "Integrity", icon: "🛡️" },
    { id: "great-teacher", label: "Great teacher", icon: "🎓" },
    { id: "went-extra-mile", label: "Went the extra mile", icon: "🚀" },
    { id: "made-me-smile", label: "Made me smile", icon: "😊" },
  ],
};
