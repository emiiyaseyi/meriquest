/**
 * The Client Desk engine. A fictional client comes with a need, a behaviour type and their own conversation flow: some
 * only need a short chat, some need onboarding, a presentation, several rounds of convincing, or ask for something
 * improper. Each choice carries tags; the tags, the client's type and whether the product suits the client decide the
 * rating. The quality of the decisions decides the result; chance only colours it a little (RULEBOOK §2.6 and §2.8).
 * Everything here is fictional and never advice.
 */

export interface ClientOption {
  id: string;
  text: string;
  tags: string[];
}
export interface ClientStep {
  id: string;
  /** May use {name} for the client and {ask} for what an improper client asks. */
  prompt: string;
  /** For the recommend step, the options are the kinds of product instead. */
  recommend: boolean;
  options: ClientOption[];
}
export interface ClientArchetype {
  id: string;
  label: string;
  icon: string;
  /** How this kind of client behaves, shown to the person. */
  trait: string;
  /** Extra points for a tag when this client sees it (negative to dislike it). */
  tagWeights: Record<string, number>;
}
export interface ClientCase {
  id: string;
  units: string[];
  name: string;
  type: "individual" | "corporate";
  archetype: string;
  story: string;
  /** The steps of this client's conversation, in order. */
  flow: string[];
  /** What an improper client asks for (used in the prompt as {ask}). */
  ask: string;
  /** Product kinds that suit this client. */
  suitable: string[];
  /** Whether the documents are not in order, so the person must check them. */
  kycRequired: boolean;
  /** How hard they are to convince: extra points above the ok score needed before they invest. 100 or more means they will not invest. */
  resistance: number;
  /** Needs this many years at Meristem before the client is offered. */
  minTenure: number;
}
export interface ClientRules {
  baseScore: number;
  tagWeights: Record<string, number>;
  /** A tag that counts as a compliance breach, with what to tell the person. */
  breachTags: Record<string, string>;
  suitableBonus: number;
  unsuitablePenalty: number;
  /** The most points chance can add or take away. */
  randomness: number;
  greatScore: number;
  goodScore: number;
  okScore: number;
}

export type Rating = "great" | "good" | "learning";
export type Outcome = "invests" | "thinking" | "declines" | "stays" | "leaves";
export interface RunResult {
  score: number;
  /** Client satisfaction, 1 to 5. */
  csat: number;
  nps: "promoter" | "passive" | "detractor";
  outcome: Outcome;
  breaches: string[];
  /** The kind of each breach, to look up what happens next: a breach tag, "unsuitable" or "kyc". */
  breachKeys: string[];
  notes: string[];
  rating: Rating;
}

/** The tags the person gathered across the steps, plus the kind recommended. */
export interface Picks {
  tags: string[];
  kind: string | null;
}

export const fill = (text: string, client: Pick<ClientCase, "name" | "ask">): string => text.replace(/\{name\}/g, client.name).replace(/\{ask\}/g, client.ask);

const NOTES: Record<string, string> = {
  pressure: "Pushing the client felt like pressure.",
  rush: "Skipping questions left the client unheard.",
  followup: "A written summary and follow-up date built trust.",
  decline: "Saying no to an improper request protected the client and the firm.",
  escalate: "Telling Compliance was the right thing to do.",
  ownership: "Owning the problem calmed the client.",
  honesty: "Being honest about what you did not know built trust.",
  patience: "Giving time to a client who needed it paid off.",
  prepared: "A tailored presentation showed you listened.",
};

export function scoreRun(rules: ClientRules, client: ClientCase, archetype: ClientArchetype | undefined, picks: Picks, noise: number, hasRecommend = true): RunResult {
  let score = rules.baseScore;
  const notes: string[] = [];
  const breaches: string[] = [];
  const breachKeys: string[] = [];
  for (const tag of picks.tags) {
    score += (rules.tagWeights[tag] ?? 0) + (archetype?.tagWeights[tag] ?? 0);
    const b = rules.breachTags[tag];
    if (b && !breaches.includes(b)) {
      breaches.push(b);
      breachKeys.push(tag);
    }
  }
  const has = (t: string) => picks.tags.includes(t);
  if (hasRecommend) {
    if (picks.kind && client.suitable.includes(picks.kind)) {
      score += rules.suitableBonus;
      notes.push("The product suited the client's need.");
    } else {
      score -= rules.unsuitablePenalty;
      breaches.push("Recommended a product that did not suit the client.");
      breachKeys.push("unsuitable");
    }
  }
  if (client.kycRequired && !has("kyc")) {
    breaches.push("Did not check the client's documents first.");
    breachKeys.push("kyc");
  }
  for (const [tag, text] of Object.entries(NOTES)) if (has(tag)) notes.push(text);
  if (has("discover") && has("suitability")) notes.push("Good questions showed what the client really needed.");
  score = Math.max(0, Math.min(100, Math.round(score + noise * rules.randomness)));
  let csat = score >= rules.greatScore ? 5 : score >= rules.goodScore ? 4 : score >= rules.okScore ? 3 : score >= rules.okScore / 2 ? 2 : 1;
  if (breaches.length > 0) csat = Math.min(csat, 2);
  const nps = csat >= 5 ? "promoter" : csat >= 4 ? "passive" : "detractor";
  const rating: Rating = breaches.length > 0 ? "learning" : csat >= 5 ? "great" : csat >= 4 ? "good" : "learning";
  // Whether the client goes ahead depends on how hard they are to convince, not only on how well the person did
  let outcome: Outcome;
  if (!hasRecommend) outcome = score >= rules.okScore && breaches.length === 0 ? "stays" : "leaves";
  else if (client.resistance >= 100 || breaches.length > 0) outcome = score >= rules.okScore && client.resistance < 100 ? "thinking" : "declines";
  else if (score >= rules.okScore + client.resistance) outcome = "invests";
  else outcome = score >= rules.okScore ? "thinking" : "declines";
  return { score, csat, nps, outcome, breaches, breachKeys, notes, rating };
}
