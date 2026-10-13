/** The starting activities in each room's location bar. Admins can edit zones and activities under Settings. */
type Fx = Partial<Record<"energy" | "focus" | "mood" | "social" | "hunger" | "hydration" | "growth" | "recognition", number>>;
const a = (id: string, label: string, icon: string, seconds: number, effects: Fx, points: number, cooldownMinutes: number, feelingLabel: string, feelingText: string, skill?: { id: string; xp: number }, event?: string) => ({
  id,
  label,
  icon,
  seconds,
  effects,
  points,
  cooldownMinutes,
  feeling: { label: feelingLabel, text: feelingText },
  ...(skill ? { skill } : {}),
  ...(event ? { event } : {}),
});

export const DEFAULT_LOCATIONS = {
  rooms: [
    {
      scene: "ikoyi-floor",
      status: "Busy and friendly on the open-plan floor",
      zones: [
        {
          id: "pantry",
          label: "Pantry",
          icon: "☕",
          activities: [
            a("pantry-coffee", "Coffee and a chat", "☕", 8, { energy: 12, social: 6, hydration: 3 }, 0, 20, "Fresh coffee", "A short chat over coffee.", { id: "communication", xp: 1 }, "coffee"),
            a("pantry-lunch", "Eat lunch", "🍲", 15, { hunger: 40, energy: 8, mood: 4 }, 0, 120, "Well fed", "A proper meal makes the afternoon easier.", undefined, "lunch"),
            a("pantry-water", "Refill your water", "💧", 5, { hydration: 25 }, 0, 10, "Refreshed", "A cool glass of water.", undefined, "water"),
          ],
        },
        {
          id: "library",
          label: "Reading corner",
          icon: "📚",
          activities: [
            a("library-read", "Read the market review", "📈", 10, { growth: 15, focus: 3 }, 1, 30, "Learning", "You picked up something new.", { id: "market-knowledge", xp: 3 }, "read"),
            a("library-policy", "Skim a policy note", "📄", 8, { growth: 10, focus: 2 }, 1, 45, "Well informed", "You refreshed a policy.", { id: "compliance", xp: 2 }),
          ],
        },
        {
          id: "team",
          label: "Team area",
          icon: "🤝",
          activities: [
            a("team-huddle", "Join a quick huddle", "🗣️", 12, { social: 10, recognition: 6, focus: 3 }, 2, 60, "Team spirit", "A short huddle lined everyone up.", { id: "communication", xp: 2 }),
            a("team-tip", "Swap a tip with a teammate", "💡", 6, { social: 6, growth: 5 }, 1, 30, "Shared knowledge", "A useful tip went both ways."),
          ],
        },
      ],
    },
    {
      scene: "ikoyi-lobby",
      status: "Guests are arriving at reception",
      zones: [
        {
          id: "reception",
          label: "Reception",
          icon: "🛎️",
          activities: [a("lobby-greet", "Greet arriving visitors", "👋", 6, { social: 6, recognition: 4 }, 1, 30, "Warm welcome", "A smile at the door sets the tone.", { id: "client-care", xp: 2 })],
        },
        {
          id: "seating",
          label: "Seating area",
          icon: "🛋️",
          activities: [a("lobby-rest", "Sit for a quiet minute", "🧘", 8, { energy: 15, focus: 6, mood: 4 }, 0, 60, "Rested", "A few quiet minutes helped.", undefined, "rest")],
        },
      ],
    },
    {
      scene: "ikoyi-boardroom",
      status: "The boardroom is ready for a meeting",
      zones: [
        {
          id: "table",
          label: "Meeting table",
          icon: "📊",
          activities: [a("board-prepare", "Prepare your talking points", "📝", 10, { focus: 8, growth: 8 }, 2, 60, "Prepared", "You know what you want to say.", { id: "communication", xp: 3 })],
        },
      ],
    },
    {
      scene: "ikoyi-lounge",
      status: "A calm place to meet and unwind",
      zones: [
        {
          id: "lounge",
          label: "Lounge",
          icon: "🛋️",
          activities: [
            a("lounge-network", "Network over coffee", "☕", 10, { social: 10, mood: 5, recognition: 4 }, 2, 60, "Good company", "You made a useful connection.", { id: "communication", xp: 2 }),
            a("lounge-rest", "Take a breather", "🌿", 8, { energy: 15, mood: 6 }, 0, 45, "Rested", "A breather in the lounge.", undefined, "rest"),
          ],
        },
      ],
    },
  ],
};
