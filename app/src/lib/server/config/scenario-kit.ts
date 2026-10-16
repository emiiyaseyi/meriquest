/**
 * A small kit for writing scenarios with consequences. A situation is a story and three or four choices; each choice says what the person did, why
 * it was right or wrong, and what would happen next in real life (a timeline and who is affected), and can bring a follow-up later or lead to the
 * next situation. All people, firms and amounts are fictional. Everything written with this kit is a draft until Group Compliance and a subject expert
 * have checked it (RULEBOOK §2.9): it describes how things typically unfold and never states a specific rule or penalty.
 */
type V = "best" | "partly" | "wrong";
type Who = "Client" | "Firm" | "You" | "Team";
type Tone = "good" | "bad" | "mixed";
type When = "Today" | "This week" | "This month" | "Later";

/** What happens next: the headline, the timeline, and who is affected. */
export type Story = [headline: string, timeline: [When, string][], impact: [Who, Tone, string][]];
/** Optional extras for a choice: a follow-up that arrives in Updates later, and the situation this choice leads to. */
export interface Extra {
  follow?: [minutes: number, icon: string, text: string, tone: "good" | "bad" | "info"];
  next?: string;
}

export const ch = (verdict: V, text: string, feedback: string, story: Story, extra: Extra = {}) => ({
  text,
  verdict,
  feedback,
  consequence: {
    headline: story[0],
    timeline: story[1].map(([when, t]) => ({ when, text: t })),
    impact: story[2].map(([who, tone, t]) => ({ who, tone, text: t })),
  },
  ...(extra.follow ? { followUp: { afterMinutes: extra.follow[0], icon: extra.follow[1], text: extra.follow[2], tone: extra.follow[3] } } : {}),
  ...(extra.next ? { next: extra.next } : {}),
});

type Choice = ReturnType<typeof ch>;

/** A situation. `chain` marks one that only appears when an earlier choice leads to it; `internal` marks a request a colleague brings to the person. */
export const sit = (id: string, units: string[], title: string, story: string, skill: string, choices: Choice[], opts: { chain?: boolean; internal?: boolean } = {}) => ({
  id,
  units,
  title,
  story,
  skill,
  chainOnly: opts.chain === true,
  internal: opts.internal === true,
  reviewed: false,
  choices,
});
