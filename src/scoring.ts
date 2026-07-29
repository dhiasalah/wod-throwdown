// ---------------------------------------------------------------------------
// Scoring engine — pure functions. See design.md / README "Ranking Rules".
//
// Ranking is always computed WITHIN a division. Per WOD we sort athletes
// best->worst and award placement points (1st = 1pt ...). Ties share the
// average of the positions they occupy. Overall standings sum placement
// points across all WODs — lowest total wins — with a best-placings countback
// to break ties.
// ---------------------------------------------------------------------------

import type {
  Athlete,
  Competition,
  Score,
  ScoreStatus,
  StoreState,
  Wod,
} from './types';

export interface RankedRow {
  athleteId: string;
  /** Placement points — the average of occupied positions on a tie (e.g. 2.5). */
  placement: number;
  /** Integer display rank; tied athletes share the smallest position in their group. */
  rankOrder: number;
  /** 'missing' when no score row exists; otherwise the recorded status. */
  status: ScoreStatus | 'missing';
  /** The raw score row for display; undefined when missing. */
  score?: Score;
}

export interface Standing {
  athleteId: string;
  total: number;
  /** Per-WOD placement points, in competition WOD order. */
  placements: number[];
  rank: number;
}

export interface DivisionStandings {
  divisionId: string;
  divisionName: string;
  standings: Standing[];
}

// ---------------------------------------------------------------------------
// Sort key: [tier, metric] where a smaller tuple (lexicographically) is better.
//   tier 0 = a scored, "primary" result (finisher for time; any result otherwise)
//   tier 1 = capped non-finisher (time WODs only)
//   tier 2 = no result (dnf / absent / missing)
// Within a tier, `metric` is arranged so ascending order = best->worst.
// Two athletes tie iff they share both tier and metric.
// ---------------------------------------------------------------------------

interface Keyed {
  athleteId: string;
  status: ScoreStatus | 'missing';
  score?: Score;
  tier: number;
  metric: number;
}

function sortKey(wod: Wod, score: Score | undefined): { tier: number; metric: number } {
  const NO_RESULT = { tier: 2, metric: 0 };

  if (!score) return NO_RESULT;
  if (score.status === 'absent' || score.status === 'dnf') return NO_RESULT;

  // status === 'done'
  switch (wod.type) {
    case 'reps':
      return typeof score.reps === 'number'
        ? { tier: 0, metric: -score.reps } // more reps = better
        : NO_RESULT;
    case 'load':
      return typeof score.loadKg === 'number'
        ? { tier: 0, metric: -score.loadKg } // more kg = better
        : NO_RESULT;
    case 'time':
      if (typeof score.timeSeconds === 'number') {
        return { tier: 0, metric: score.timeSeconds }; // finisher, faster = better
      }
      if (typeof score.reps === 'number') {
        return { tier: 1, metric: -score.reps }; // capped, more reps = better
      }
      return NO_RESULT;
  }
}

/**
 * Rank a single WOD for a set of athletes (already scoped to one division and
 * entered in the competition). `scores` may contain scores for other WODs /
 * athletes — only rows matching this WOD and an athlete in the list are used.
 */
export function rankWod(wod: Wod, athletes: Athlete[], scores: Score[]): RankedRow[] {
  const byAthlete = new Map<string, Score>();
  for (const s of scores) {
    if (s.wodId === wod.id) byAthlete.set(s.athleteId, s);
  }

  const keyed: Keyed[] = athletes.map((a) => {
    const score = byAthlete.get(a.id);
    const { tier, metric } = sortKey(wod, score);
    return {
      athleteId: a.id,
      status: score ? score.status : 'missing',
      score,
      tier,
      metric,
    };
  });

  // Stable sort best -> worst. Equal (tier, metric) keeps input order (a tie).
  const order = keyed
    .map((k, i) => ({ k, i }))
    .sort((x, y) => {
      if (x.k.tier !== y.k.tier) return x.k.tier - y.k.tier;
      if (x.k.metric !== y.k.metric) return x.k.metric - y.k.metric;
      return x.i - y.i;
    })
    .map((e) => e.k);

  const rows: RankedRow[] = new Array(order.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (
      j < order.length &&
      order[j].tier === order[i].tier &&
      order[j].metric === order[i].metric
    ) {
      j++;
    }
    // Group occupies positions (i+1) .. j (1-indexed). Averaged placement.
    const avg = (i + 1 + j) / 2;
    const rankOrder = i + 1;
    for (let k = i; k < j; k++) {
      const item = order[k];
      rows[k] = {
        athleteId: item.athleteId,
        placement: avg,
        rankOrder,
        status: item.status,
        score: item.score,
      };
    }
    i = j;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Overall standings, grouped by division.
// ---------------------------------------------------------------------------

type ScoringData = Pick<StoreState, 'divisions' | 'athletes' | 'wods' | 'scores'>;

/** Compare two athletes' placement lists as a best-placings countback.
 * Returns <0 if `a` is better (should rank first). */
function countback(a: number[], b: number[]): number {
  const as = [...a].sort((x, y) => x - y);
  const bs = [...b].sort((x, y) => x - y);
  const n = Math.max(as.length, bs.length);
  for (let i = 0; i < n; i++) {
    const av = as[i] ?? Infinity;
    const bv = bs[i] ?? Infinity;
    if (av !== bv) return av - bv; // smaller (better) placing first
  }
  return 0;
}

export function overallStandings(
  competition: Competition,
  data: ScoringData,
): DivisionStandings[] {
  const wodsInComp = competition.wodIds
    .map((id) => data.wods.find((w) => w.id === id))
    .filter((w): w is Wod => Boolean(w));

  const enteredAthletes = data.athletes.filter((a) => competition.athleteIds.includes(a.id));

  // Only scores for this competition matter.
  const compScores = data.scores.filter((s) => s.competitionId === competition.id);

  // Divisions that actually have entered athletes, in the order divisions were defined.
  const divisionIds = Array.from(new Set(enteredAthletes.map((a) => a.divisionId)));

  return divisionIds.map((divisionId) => {
    const division = data.divisions.find((d) => d.id === divisionId);
    const divAthletes = enteredAthletes.filter((a) => a.divisionId === divisionId);

    // placement points per athlete, per WOD (in competition order).
    const totals = new Map<string, { total: number; placements: number[] }>();
    for (const a of divAthletes) totals.set(a.id, { total: 0, placements: [] });

    for (const w of wodsInComp) {
      const ranked = rankWod(w, divAthletes, compScores);
      for (const row of ranked) {
        const t = totals.get(row.athleteId)!;
        t.total += row.placement;
        t.placements.push(row.placement);
      }
    }

    const standings: Standing[] = divAthletes.map((a) => {
      const t = totals.get(a.id)!;
      return { athleteId: a.id, total: t.total, placements: t.placements, rank: 0 };
    });

    // Lowest total wins; break ties by countback.
    standings.sort((x, y) => {
      if (x.total !== y.total) return x.total - y.total;
      return countback(x.placements, y.placements);
    });

    // Assign ranks; genuinely-equal athletes (same total AND identical countback) share a rank.
    let rank = 0;
    for (let i = 0; i < standings.length; i++) {
      const prev = standings[i - 1];
      const cur = standings[i];
      const tiedWithPrev =
        prev &&
        prev.total === cur.total &&
        countback(prev.placements, cur.placements) === 0;
      rank = tiedWithPrev ? rank : i + 1;
      cur.rank = rank;
    }

    return {
      divisionId,
      divisionName: division ? division.name : 'Unknown',
      standings,
    };
  });
}
