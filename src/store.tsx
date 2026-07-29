import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  emptyState,
  STORAGE_KEY,
  type Athlete,
  type Competition,
  type Division,
  type Score,
  type StoreState,
  type Wod,
} from './types';
import { uid } from './lib/id';

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

export function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return emptyState();
  }
}

/** Validate/shape unknown JSON into a StoreState (used by load + import). */
export function normalizeState(input: unknown): StoreState {
  const base = emptyState();
  if (!input || typeof input !== 'object') return base;
  const obj = input as Record<string, unknown>;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    divisions: arr<Division>(obj.divisions),
    athletes: arr<Athlete>(obj.athletes),
    wods: arr<Wod>(obj.wods),
    competitions: arr<Competition>(obj.competitions),
    scores: arr<Score>(obj.scores),
  };
}

// ---------------------------------------------------------------------------
// Store API
// ---------------------------------------------------------------------------

export interface StoreApi {
  state: StoreState;

  // Divisions
  addDivision: (name: string) => Division;
  updateDivision: (id: string, patch: Partial<Omit<Division, 'id'>>) => void;
  deleteDivision: (id: string) => void;

  // Athletes
  addAthlete: (name: string, divisionId: string) => Athlete;
  updateAthlete: (id: string, patch: Partial<Omit<Athlete, 'id'>>) => void;
  deleteAthlete: (id: string) => void;

  // WODs
  addWod: (wod: Omit<Wod, 'id'>) => Wod;
  updateWod: (id: string, patch: Partial<Omit<Wod, 'id'>>) => void;
  deleteWod: (id: string) => void;

  // Competitions
  addCompetition: (comp: Omit<Competition, 'id' | 'wodIds' | 'athleteIds'>) => Competition;
  updateCompetition: (id: string, patch: Partial<Omit<Competition, 'id'>>) => void;
  deleteCompetition: (id: string) => void;

  // Scores
  setScore: (score: Score) => void;
  clearScore: (competitionId: string, wodId: string, athleteId: string) => void;

  // Backup
  replaceAll: (next: StoreState) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => loadState());

  // Debounced persistence — avoids a synchronous localStorage write on every keystroke.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // storage full / unavailable — ignore, in-memory state still works
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state]);

  const api = useMemo<StoreApi>(() => {
    const patchState = (fn: (s: StoreState) => StoreState) => setState((s) => fn(s));

    return {
      state,

      // -- Divisions --
      addDivision(name) {
        const division: Division = { id: uid(), name: name.trim() };
        patchState((s) => ({ ...s, divisions: [...s.divisions, division] }));
        return division;
      },
      updateDivision(id, patch) {
        patchState((s) => ({
          ...s,
          divisions: s.divisions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }));
      },
      deleteDivision(id) {
        patchState((s) => {
          const athleteIds = s.athletes.filter((a) => a.divisionId === id).map((a) => a.id);
          const idSet = new Set(athleteIds);
          return {
            ...s,
            divisions: s.divisions.filter((d) => d.id !== id),
            athletes: s.athletes.filter((a) => a.divisionId !== id),
            scores: s.scores.filter((sc) => !idSet.has(sc.athleteId)),
            competitions: s.competitions.map((c) => ({
              ...c,
              athleteIds: c.athleteIds.filter((aid) => !idSet.has(aid)),
            })),
          };
        });
      },

      // -- Athletes --
      addAthlete(name, divisionId) {
        const athlete: Athlete = { id: uid(), name: name.trim(), divisionId };
        patchState((s) => ({ ...s, athletes: [...s.athletes, athlete] }));
        return athlete;
      },
      updateAthlete(id, patch) {
        patchState((s) => ({
          ...s,
          athletes: s.athletes.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },
      deleteAthlete(id) {
        patchState((s) => ({
          ...s,
          athletes: s.athletes.filter((a) => a.id !== id),
          scores: s.scores.filter((sc) => sc.athleteId !== id),
          competitions: s.competitions.map((c) => ({
            ...c,
            athleteIds: c.athleteIds.filter((aid) => aid !== id),
          })),
        }));
      },

      // -- WODs --
      addWod(wod) {
        const created: Wod = { id: uid(), ...wod };
        patchState((s) => ({ ...s, wods: [...s.wods, created] }));
        return created;
      },
      updateWod(id, patch) {
        patchState((s) => ({
          ...s,
          wods: s.wods.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        }));
      },
      deleteWod(id) {
        patchState((s) => ({
          ...s,
          wods: s.wods.filter((w) => w.id !== id),
          scores: s.scores.filter((sc) => sc.wodId !== id),
          competitions: s.competitions.map((c) => ({
            ...c,
            wodIds: c.wodIds.filter((wid) => wid !== id),
          })),
        }));
      },

      // -- Competitions --
      addCompetition(comp) {
        const created: Competition = { id: uid(), wodIds: [], athleteIds: [], ...comp };
        patchState((s) => ({ ...s, competitions: [...s.competitions, created] }));
        return created;
      },
      updateCompetition(id, patch) {
        patchState((s) => ({
          ...s,
          competitions: s.competitions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },
      deleteCompetition(id) {
        patchState((s) => ({
          ...s,
          competitions: s.competitions.filter((c) => c.id !== id),
          scores: s.scores.filter((sc) => sc.competitionId !== id),
        }));
      },

      // -- Scores --
      setScore(score) {
        patchState((s) => {
          const idx = s.scores.findIndex(
            (sc) =>
              sc.competitionId === score.competitionId &&
              sc.wodId === score.wodId &&
              sc.athleteId === score.athleteId,
          );
          const scores = [...s.scores];
          if (idx >= 0) scores[idx] = score;
          else scores.push(score);
          return { ...s, scores };
        });
      },
      clearScore(competitionId, wodId, athleteId) {
        patchState((s) => ({
          ...s,
          scores: s.scores.filter(
            (sc) =>
              !(
                sc.competitionId === competitionId &&
                sc.wodId === wodId &&
                sc.athleteId === athleteId
              ),
          ),
        }));
      },

      // -- Backup --
      replaceAll(next) {
        setState(normalizeState(next));
      },
      reset() {
        setState(emptyState());
      },
    };
  }, [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
