// ---------------------------------------------------------------------------
// Data model for WOD Ranker. See design.md for the full description.
// ---------------------------------------------------------------------------

export type WodType = 'reps' | 'time' | 'load';

export type ScoreStatus = 'done' | 'dnf' | 'absent';

export interface Division {
  id: string;
  name: string; // e.g. "Men Rx", "Women Scaled"
}

export interface Athlete {
  id: string;
  name: string;
  divisionId: string;
}

export interface Wod {
  id: string;
  name: string;
  description?: string;
  type: WodType;
  timeCapSeconds?: number; // required for 'time'
}

export interface Competition {
  id: string;
  name: string;
  date: string; // ISO yyyy-mm-dd
  wodIds: string[];
  athleteIds: string[]; // who is entered
}

/** One athlete's result in one WOD of one competition. */
export interface Score {
  competitionId: string;
  wodId: string;
  athleteId: string;
  status: ScoreStatus;
  reps?: number; // 'reps' type; OR reps completed at the cap for a capped 'time' WOD
  timeSeconds?: number; // 'time' type, only when finished (status 'done')
  loadKg?: number; // 'load' type
}

/** The entire persisted application state. */
export interface StoreState {
  divisions: Division[];
  athletes: Athlete[];
  wods: Wod[];
  competitions: Competition[];
  scores: Score[];
}

export const emptyState = (): StoreState => ({
  divisions: [],
  athletes: [],
  wods: [],
  competitions: [],
  scores: [],
});

export const STORAGE_KEY = 'wodranker:v1';
