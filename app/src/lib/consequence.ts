/**
 * What happens after a choice, in the real world. Every scenario choice can carry:
 *  - a consequence: a short headline, a timeline (today, this week, this month) and who is affected (the client, the firm,
 *    you, your team), so people see where a decision leads and not only whether it was "right";
 *  - a follow-up: an update that arrives later, because in real life the consequence does not appear at once;
 *  - a next situation: the choice leads to the next situation the person faces (a chain).
 * All of it is practice and fictional, and a learning consequence only: never real HR action (RULEBOOK §2.9).
 */
export type ImpactWho = "Client" | "Firm" | "You" | "Team";
export type ImpactTone = "good" | "bad" | "mixed";

export interface Consequence {
  /** One line: what this choice led to. */
  headline: string;
  /** What happens next, in order. `when` is a short label such as "Today", "This week" or "This month". */
  timeline: { when: string; text: string }[];
  /** Who is affected and how. */
  impact: { who: ImpactWho; tone: ImpactTone; text: string }[];
}

export interface FollowUp {
  /** Real minutes until it arrives in Updates (a stand-in for the days that pass in real life). */
  afterMinutes: number;
  icon: string;
  /** What the person reads in Updates. */
  text: string;
  tone: "good" | "bad" | "info";
}

/** The most chained situations one shift or run may add, so a chain can never run away. */
export const MAX_CHAIN = 3;

export const WHO_ICON: Record<ImpactWho, string> = { Client: "🤝", Firm: "🏢", You: "🙋", Team: "👥" };
