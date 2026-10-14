/**
 * The Client Desk engine. A fictional client comes with a need and a behaviour type. The person goes through four steps
 * (meet, understand, recommend, close); each choice carries tags, and the tags, the client's type and whether the product
 * suits the client decide the rating. The quality of the decisions decides the result; chance only colours it a little
 * (RULEBOOK §2.6 and §2.8). Everything here is fictional and never advice.
 */

export interface ClientOption {
  id: string;
  text: string;
  tags: string[];
}
export interface ClientStep {
  id: string;
  prompt: string;
  /** For the recommend step, the options are the kinds of product instead. */
  recommend?: boolean;
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
  /** Product kinds that suit this client. */
  suitable: string[];
  /** Whether the documents are not in order, so the person must check them. */
  kycRequired: boolean;
  /** Needs this many years at Meristem before the client is offered (corporate clients are for more experienced staff). */
  minTenure: number;
}
export interface ClientRules {
  baseScore: number;
  tagWeights: Record<string, number>;
  suitableBonus: number;
  unsuitablePenalty: number;
  /** The most points chance can add or take away. */
  randomness: number;
  greatScore: number;
  goodScore: number;
  okScore: number;
}

export type Rating = "great" | "good" | "learning";
export interface RunResult {
  score: number;
  /** Client satisfaction, 1 to 5. */
  csat: number;
  nps: "promoter" | "passive" | "detractor";
  breaches: string[];
  notes: string[];
  rating: Rating;
}

/** The tags the person gathered, by step, plus the kind recommended. */
export interface Picks {
  tags: string[];
  kind: string | null;
}

export function scoreRun(rules: ClientRules, client: ClientCase, archetype: ClientArchetype | undefined, picks: Picks, noise: number): RunResult {
  let score = rules.baseScore;
  const notes: string[] = [];
  const breaches: string[] = [];
  for (const tag of picks.tags) {
    const w = (rules.tagWeights[tag] ?? 0) + (archetype?.tagWeights[tag] ?? 0);
    score += w;
  }
  const has = (t: string) => picks.tags.includes(t);
  if (picks.kind && client.suitable.includes(picks.kind)) {
    score += rules.suitableBonus;
    notes.push("The product suited the client's need.");
  } else {
    score -= rules.unsuitablePenalty;
    breaches.push("Recommended a product that did not suit the client.");
  }
  if (client.kycRequired && !has("kyc")) breaches.push("Did not check the client's documents first.");
  if (has("promise")) breaches.push("Promised returns, which is never allowed.");
  if (has("pressure")) notes.push("Pushing the client felt like pressure.");
  if (has("rush")) notes.push("Skipping questions left the client unheard.");
  if (has("discover") && has("suitability")) notes.push("Good questions showed what the client really needed.");
  if (has("followup")) notes.push("A written summary and follow-up date built trust.");
  score = Math.max(0, Math.min(100, Math.round(score + noise * rules.randomness)));
  let csat = score >= rules.greatScore ? 5 : score >= rules.goodScore ? 4 : score >= rules.okScore ? 3 : score >= rules.okScore / 2 ? 2 : 1;
  if (breaches.length > 0) csat = Math.min(csat, 2);
  const nps = csat >= 5 ? "promoter" : csat >= 4 ? "passive" : "detractor";
  const rating: Rating = breaches.length > 0 ? "learning" : csat >= 5 ? "great" : csat >= 4 ? "good" : "learning";
  return { score, csat, nps, breaches, notes, rating };
}
