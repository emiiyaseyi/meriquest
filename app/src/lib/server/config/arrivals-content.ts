/** The starting rules for visitors through the day. Admins can change everything under Settings > Visitors. All names are fictional. */
export const DEFAULT_ARRIVALS = {
  settings: {
    /** When off, the whole day's visitors are there from the start and nobody gives up waiting. */
    enabled: true,
    /** A new client arrives about this often while the person is in the game. */
    clientsEverySeconds: 75,
    /** How many colleagues come to the person each day, and about how often. */
    internalPerDay: 5,
    internalEverySeconds: 240,
    /** Share of the day's clients who have an appointment with the person as their account officer (the rest walk in). */
    appointmentShare: 40,
    /** How long a visitor waits, in game time, before giving up and leaving. */
    patienceSeconds: 240,
    /** The most visitors waiting at once. Others wait outside until there is room. */
    maxWaiting: 4,
    /** How many regular clients each person has as their account officer (the same ones come back). */
    bookSize: 8,
    /** Merit points for handling a colleague's request well. */
    internalPointsBest: 2,
    internalPointsPartly: 1,
  },
  /** First names for colleagues who come with a request. */
  names: ["Chidi", "Aisha", "Tobi", "Ngozi", "Femi", "Bayo", "Kemi", "Uche", "Hauwa", "Segun", "Amara", "Dayo", "Zainab", "Emeka", "Folake", "Ibrahim", "Nneka", "Tunde", "Yetunde", "Musa"],
  /** Where they come from. "your manager" is shown as "Your manager". */
  departments: ["Compliance", "Operations", "IT", "HR", "Finance", "Risk", "Legal", "Internal Audit", "your manager", "a colleague"],
};
