/** The starting chat settings. Admins can change everything under Settings, and should extend the word list. */
export const DEFAULT_CHAT = {
  settings: {
    maxLength: 280,
    /** Messages one person may send each minute. */
    perMinute: 8,
    /** Reports from different people after which a message is hidden until an admin looks at it. */
    reportsToHide: 2,
    /** How many recent messages a conversation shows. */
    historyLimit: 60,
    blockLinks: true,
    directMessages: true,
  },
  groups: [
    { id: "everyone", label: "Everyone at Meristem", icon: "🌍", units: ["*"] },
    { id: "cx", label: "Customer Experience", icon: "💬", units: ["cx"] },
    { id: "wealth", label: "Wealth Advisory", icon: "💼", units: ["wealth"] },
    { id: "invest", label: "Investment Advisory", icon: "📈", units: ["invest"] },
    { id: "learning", label: "Learning corner", icon: "🎓", units: ["*"] },
  ],
  /** A starting list of words and phrases that stop a message from being sent. Add to it as needed. */
  blockedWords: ["idiot", "stupid", "fool", "useless", "shut up", "hate you", "moron", "dumb", "loser", "nonsense person"],
};
