import { hashString, seeded } from "@/lib/iso/geometry";

/**
 * Work shifts: press Go to work, stay for the shift, answer the workplace situations that come up, and be paid in
 * Merit points when the shift ends. Plain functions, safe on the server and in the browser. The situations, the
 * length of a shift and the points all come from the admin-editable "shifts" setting.
 */
export type Verdict = "best" | "partly" | "wrong";

export interface ShiftTaskDef {
  id: string;
  /** Units this situation is for. "*" means everyone. */
  units: string[];
  title: string;
  story: string;
  skill?: string;
  choices: { text: string; verdict: Verdict; feedback: string }[];
}

export interface ShiftSettings {
  minutes: number;
  tasksPerShift: number;
  shiftsPerDay: number;
  pointsBest: number;
  pointsPartly: number;
  completionBonus: number;
  skillXpBest: number;
}

export interface ShiftRecord {
  /** The work style picked for this shift (see the "shifts" setting). */
  style?: string;
  startedAt: number;
  endsAt: number;
  minutes: number;
  taskIds: string[];
  /** The verdict and the choice the person saw, for each answered task. */
  answers: Record<string, { shown: number; verdict: Verdict; at: number }>;
}

/** When task number `i` (from 0) appears: spread evenly across the shift, the first one straight away. */
export function opensAt(rec: Pick<ShiftRecord, "startedAt" | "minutes" | "taskIds">, i: number): number {
  return rec.startedAt + Math.floor((i * rec.minutes * 60_000) / Math.max(1, rec.taskIds.length));
}

/** Pick the situations for a shift: the person's unit first, then ones for everyone, never repeating. */
export function drawTasks(pool: ShiftTaskDef[], unit: string, n: number, seed: string): string[] {
  const rnd = seeded(hashString(seed));
  const shuffle = <T,>(a: T[]) => {
    const out = [...a];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const mine = shuffle(pool.filter((t) => t.units.includes(unit)));
  const rest = shuffle(pool.filter((t) => !t.units.includes(unit) && t.units.includes("*")));
  // Mix them so a shift is mostly the person's own work with some general situations
  const picked: ShiftTaskDef[] = [];
  const own = Math.min(mine.length, Math.max(1, Math.ceil(n * 0.7)));
  picked.push(...mine.slice(0, own));
  for (const t of [...rest, ...mine.slice(own)]) if (picked.length < n) picked.push(t);
  return shuffle(picked).slice(0, n).map((t) => t.id);
}

/** The choices of a situation are shuffled the same way every time for the same person. */
export function choiceOrder(staffId: string, taskId: string, n: number): number[] {
  const rnd = seeded(hashString(`${staffId}|shift|${taskId}`));
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * What a shift pays: points for each answer, and a bonus when every situation was answered, scaled by the work style's pay
 * percentage (100 is normal). Used both for the "so far" figure during the shift and for the final pay.
 */
export function shiftPay(rec: ShiftRecord, s: ShiftSettings, payPercent = 100): { points: number; best: number; answered: number } {
  const verdicts = rec.taskIds.map((id) => rec.answers[id]?.verdict).filter((v): v is Verdict => !!v);
  const best = verdicts.filter((v) => v === "best").length;
  const partly = verdicts.filter((v) => v === "partly").length;
  const bonus = verdicts.length === rec.taskIds.length ? s.completionBonus : 0;
  const base = best * s.pointsBest + partly * s.pointsPartly + bonus;
  return { points: Math.round((base * payPercent) / 100), best, answered: verdicts.length };
}

/** How well the situations answered so far were handled, 0 to 100 (100 before the first answer). Best counts fully, partly counts half. */
export function shiftPerformance(rec: Pick<ShiftRecord, "taskIds" | "answers">): number {
  const verdicts = rec.taskIds.map((id) => rec.answers[id]?.verdict).filter((v): v is Verdict => !!v);
  if (verdicts.length === 0) return 100;
  const score = verdicts.reduce((n, v) => n + (v === "best" ? 1 : v === "partly" ? 0.5 : 0), 0);
  return Math.round((score / verdicts.length) * 100);
}
