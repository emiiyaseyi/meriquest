/**
 * The leadership simulator: a short run of people-management decisions. Each choice moves a few meters (team morale,
 * delivery, client trust, compliance...) up or down, and the run is rated on where the meters end. Plain functions,
 * safe on the server and in the browser. Scenarios, meters and points come from the admin-editable "leadership" setting.
 */
export type Meters = Record<string, number>;

export interface LeadChoice {
  text: string;
  /** How much each meter changes, by meter id. */
  effects: Record<string, number>;
  feedback: string;
}

export interface LeadScenario {
  id: string;
  title: string;
  story: string;
  choices: LeadChoice[];
}

export type Rating = "great" | "good" | "learning";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function startMeters(ids: string[], start: number): Meters {
  return Object.fromEntries(ids.map((id) => [id, start]));
}

export function applyChoice(meters: Meters, effects: Record<string, number>): Meters {
  const out = { ...meters };
  for (const id of Object.keys(out)) out[id] = clamp(out[id] + (effects[id] ?? 0));
  return out;
}

/** Great: every meter healthy and a strong average. Good: a fair average and nothing in the red. Otherwise: keep learning. */
export function rate(meters: Meters, thresholds: { great: number; good: number; floor: number }): Rating {
  const v = Object.values(meters);
  if (v.length === 0) return "learning";
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  const min = Math.min(...v);
  if (avg >= thresholds.great && min >= thresholds.good) return "great";
  if (avg >= thresholds.good && min >= thresholds.floor) return "good";
  return "learning";
}

/** The choices of a scenario are shuffled the same way each time for the same person and run. */
export function order(seedValue: number, n: number): number[] {
  let s = seedValue >>> 0 || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
