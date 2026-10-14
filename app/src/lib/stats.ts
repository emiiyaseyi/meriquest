/** Running totals for each person, kept on their record. Used by reports and succession planning. */
export interface PersonStats {
  shifts: number;
  shiftPoints: number;
  leadRuns: number;
  leadGreat: number;
  leadGood: number;
  leadLast?: "great" | "good" | "learning";
  leadLastAt?: number;
  simRuns: number;
  simGreat: number;
  /** Client Desk: clients served, the sum of their ratings (for the average) and compliance breaches. */
  clientsServed: number;
  csatTotal: number;
  clientBreaches: number;
}

export const EMPTY_STATS: PersonStats = { shifts: 0, shiftPoints: 0, leadRuns: 0, leadGreat: 0, leadGood: 0, simRuns: 0, simGreat: 0, clientsServed: 0, csatTotal: 0, clientBreaches: 0 };

export const withStats = (s: Partial<PersonStats> | undefined): PersonStats => ({ ...EMPTY_STATS, ...(s ?? {}) });
