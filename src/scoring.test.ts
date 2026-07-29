import { describe, expect, test } from 'vitest';
import { rankWod, overallStandings } from './scoring';
import type {
  Athlete,
  Competition,
  Division,
  Score,
  StoreState,
  Wod,
} from './types';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const wod = (id: string, type: Wod['type'], extra: Partial<Wod> = {}): Wod => ({
  id,
  name: id,
  type,
  ...extra,
});

const ath = (id: string, divisionId = 'rx'): Athlete => ({ id, name: id, divisionId });

const score = (athleteId: string, wodId: string, s: Partial<Score>): Score => ({
  competitionId: 'c1',
  wodId,
  athleteId,
  status: 'done',
  ...s,
});

/** Map athleteId -> placement points for a ranked WOD. */
const placements = (rows: ReturnType<typeof rankWod>): Record<string, number> =>
  Object.fromEntries(rows.map((r) => [r.athleteId, r.placement]));

// ---------------------------------------------------------------------------
// Per-WOD ranking: reps
// ---------------------------------------------------------------------------

describe('rankWod — reps (AMRAP)', () => {
  test('higher reps ranks first, placement points 1..n', () => {
    const w = wod('w', 'reps');
    const athletes = [ath('a'), ath('b'), ath('c')];
    const scores = [
      score('a', 'w', { reps: 200 }),
      score('b', 'w', { reps: 300 }),
      score('c', 'w', { reps: 250 }),
    ];
    const p = placements(rankWod(w, athletes, scores));
    expect(p).toEqual({ b: 1, c: 2, a: 3 });
  });

  test('identical reps share the average of the positions they occupy', () => {
    const w = wod('w', 'reps');
    const athletes = [ath('a'), ath('b'), ath('c')];
    const scores = [
      score('a', 'w', { reps: 250 }),
      score('b', 'w', { reps: 300 }),
      score('c', 'w', { reps: 250 }),
    ];
    // b=1st; a & c tie for 2nd/3rd => 2.5 each
    const p = placements(rankWod(w, athletes, scores));
    expect(p).toEqual({ b: 1, a: 2.5, c: 2.5 });
  });
});

// ---------------------------------------------------------------------------
// Per-WOD ranking: load
// ---------------------------------------------------------------------------

describe('rankWod — load (max)', () => {
  test('higher kg ranks first', () => {
    const w = wod('w', 'load');
    const athletes = [ath('a'), ath('b'), ath('c')];
    const scores = [
      score('a', 'w', { loadKg: 180 }),
      score('b', 'w', { loadKg: 200 }),
      score('c', 'w', { loadKg: 170 }),
    ];
    const p = placements(rankWod(w, athletes, scores));
    expect(p).toEqual({ b: 1, a: 2, c: 3 });
  });
});

// ---------------------------------------------------------------------------
// Per-WOD ranking: time + cap
// ---------------------------------------------------------------------------

describe('rankWod — time (For Time + cap)', () => {
  test('finishers ranked fastest-first', () => {
    const w = wod('w', 'time', { timeCapSeconds: 300 });
    const athletes = [ath('a'), ath('b'), ath('c')];
    const scores = [
      score('a', 'w', { timeSeconds: 200 }),
      score('b', 'w', { timeSeconds: 150 }),
      score('c', 'w', { timeSeconds: 240 }),
    ];
    const p = placements(rankWod(w, athletes, scores));
    expect(p).toEqual({ b: 1, a: 2, c: 3 });
  });

  test('finishers always rank above capped non-finishers', () => {
    const w = wod('w', 'time', { timeCapSeconds: 300 });
    const athletes = [ath('a'), ath('b')];
    const scores = [
      // a finished slowly, b was capped having done many reps
      score('a', 'w', { timeSeconds: 299 }),
      score('b', 'w', { timeSeconds: undefined, reps: 500 }),
    ];
    const p = placements(rankWod(w, athletes, scores));
    expect(p).toEqual({ a: 1, b: 2 });
  });

  test('among capped non-finishers, more reps ranks first', () => {
    const w = wod('w', 'time', { timeCapSeconds: 300 });
    const athletes = [ath('a'), ath('b'), ath('c')];
    const scores = [
      score('a', 'w', { timeSeconds: undefined, reps: 40 }),
      score('b', 'w', { timeSeconds: undefined, reps: 55 }),
      score('c', 'w', { timeSeconds: undefined, reps: 50 }),
    ];
    const p = placements(rankWod(w, athletes, scores));
    expect(p).toEqual({ b: 1, c: 2, a: 3 });
  });
});

// ---------------------------------------------------------------------------
// No-result handling
// ---------------------------------------------------------------------------

describe('rankWod — dnf / absent / missing sort to the bottom', () => {
  test('missing score is last place', () => {
    const w = wod('w', 'reps');
    const athletes = [ath('a'), ath('b'), ath('c')];
    const scores = [
      score('a', 'w', { reps: 100 }),
      score('b', 'w', { reps: 200 }),
      // c has no score at all
    ];
    const p = placements(rankWod(w, athletes, scores));
    expect(p).toEqual({ b: 1, a: 2, c: 3 });
  });

  test('absent and dnf sink below every scored athlete and tie for last', () => {
    const w = wod('w', 'reps');
    const athletes = [ath('a'), ath('b'), ath('c'), ath('d')];
    const scores = [
      score('a', 'w', { reps: 100 }),
      score('b', 'w', { reps: 200 }),
      score('c', 'w', { status: 'absent' }),
      score('d', 'w', { status: 'dnf' }),
    ];
    // b=1, a=2, c & d tie for 3rd/4th => 3.5 each
    const p = placements(rankWod(w, athletes, scores));
    expect(p).toEqual({ b: 1, a: 2, c: 3.5, d: 3.5 });
  });
});

// ---------------------------------------------------------------------------
// Overall standings
// ---------------------------------------------------------------------------

const buildData = (
  athletes: Athlete[],
  wods: Wod[],
  scores: Score[],
  divisions: Division[] = [{ id: 'rx', name: 'Rx' }],
): StoreState => ({ divisions, athletes, wods, competitions: [], scores });

describe('overallStandings', () => {
  test('lowest total placement points wins', () => {
    const athletes = [ath('a'), ath('b')];
    const wods = [wod('w1', 'reps'), wod('w2', 'reps')];
    const scores = [
      score('a', 'w1', { reps: 100 }), // a 2nd
      score('b', 'w1', { reps: 200 }), // b 1st
      score('a', 'w2', { reps: 100 }), // a 2nd
      score('b', 'w2', { reps: 200 }), // b 1st
    ];
    const comp: Competition = {
      id: 'c1',
      name: 'Comp',
      date: '2026-01-01',
      wodIds: ['w1', 'w2'],
      athleteIds: ['a', 'b'],
    };
    const divs = overallStandings(comp, buildData(athletes, wods, scores));
    expect(divs).toHaveLength(1);
    const rx = divs[0].standings;
    expect(rx.map((s) => s.athleteId)).toEqual(['b', 'a']);
    expect(rx[0]).toMatchObject({ athleteId: 'b', total: 2, rank: 1 });
    expect(rx[1]).toMatchObject({ athleteId: 'a', total: 4, rank: 2 });
  });

  test('countback breaks ties: the athlete with the better single placing wins', () => {
    // Two athletes tie on total; one has a 1st, the other two 2nds.
    const athletes = [ath('a'), ath('b')];
    const wods = [wod('w1', 'reps'), wod('w2', 'reps'), wod('w3', 'reps')];
    const scores = [
      // w1: a 1st, b 2nd
      score('a', 'w1', { reps: 300 }),
      score('b', 'w1', { reps: 200 }),
      // w2: b 1st, a 2nd
      score('a', 'w2', { reps: 200 }),
      score('b', 'w2', { reps: 300 }),
      // w3: tie -> both 1.5
      score('a', 'w3', { reps: 250 }),
      score('b', 'w3', { reps: 250 }),
    ];
    // totals: a = 1 + 2 + 1.5 = 4.5 ; b = 2 + 1 + 1.5 = 4.5 -> tie
    // countback sorted asc: a=[1,1.5,2] b=[1,1.5,2] -> genuinely identical
    const comp: Competition = {
      id: 'c1',
      name: 'Comp',
      date: '2026-01-01',
      wodIds: ['w1', 'w2', 'w3'],
      athleteIds: ['a', 'b'],
    };
    const rx = overallStandings(comp, buildData(athletes, wods, scores))[0].standings;
    // identical countback -> genuinely share rank 1
    expect(rx[0].rank).toBe(1);
    expect(rx[1].rank).toBe(1);
  });

  test('countback resolves when placement multisets differ', () => {
    const athletes = [ath('a'), ath('b')];
    const wods = [wod('w1', 'reps'), wod('w2', 'reps')];
    const scores = [
      // a: 1st then 4-equivalent; give a a 1st and a 3rd via a 3-athlete field? keep 2 athletes:
      // w1: a 1st (300), b 2nd (200)
      score('a', 'w1', { reps: 300 }),
      score('b', 'w1', { reps: 200 }),
      // w2: a 2nd (200), b 1st (300)
      score('a', 'w2', { reps: 200 }),
      score('b', 'w2', { reps: 300 }),
    ];
    // totals a=3, b=3; countback a=[1,2], b=[1,2] identical -> tie, both rank 1
    const comp: Competition = {
      id: 'c1',
      name: 'Comp',
      date: '2026-01-01',
      wodIds: ['w1', 'w2'],
      athleteIds: ['a', 'b'],
    };
    const rx = overallStandings(comp, buildData(athletes, wods, scores))[0].standings;
    expect(rx[0].rank).toBe(1);
    expect(rx[1].rank).toBe(1);
  });

  test('rankings are computed independently within each division', () => {
    const athletes = [ath('a', 'men'), ath('b', 'men'), ath('c', 'women')];
    const wods = [wod('w1', 'reps')];
    const scores = [
      score('a', 'w1', { reps: 100 }),
      score('b', 'w1', { reps: 200 }),
      score('c', 'w1', { reps: 50 }),
    ];
    const divisions: Division[] = [
      { id: 'men', name: 'Men' },
      { id: 'women', name: 'Women' },
    ];
    const comp: Competition = {
      id: 'c1',
      name: 'Comp',
      date: '2026-01-01',
      wodIds: ['w1'],
      athleteIds: ['a', 'b', 'c'],
    };
    const divs = overallStandings(comp, buildData(athletes, wods, scores, divisions));
    const men = divs.find((d) => d.divisionId === 'men')!;
    const women = divs.find((d) => d.divisionId === 'women')!;
    expect(men.standings.map((s) => s.athleteId)).toEqual(['b', 'a']);
    expect(men.standings[0]).toMatchObject({ rank: 1, total: 1 });
    // c is alone in women -> 1st with total 1 (only competitor)
    expect(women.standings).toHaveLength(1);
    expect(women.standings[0]).toMatchObject({ athleteId: 'c', rank: 1, total: 1 });
  });
});

// ---------------------------------------------------------------------------
// Worked example (must match README's "Ranking Rules" worked example)
// ---------------------------------------------------------------------------

describe('README worked example', () => {
  test('produces the documented leaderboard', () => {
    const divisions: Division[] = [{ id: 'rx', name: 'Rx' }];
    const athletes = [ath('A'), ath('B'), ath('C'), ath('D')];
    const wods = [
      wod('cindy', 'reps', { name: 'Cindy' }),
      wod('grace', 'time', { name: 'Grace', timeCapSeconds: 300 }),
      wod('deadlift', 'load', { name: 'Max Deadlift' }),
    ];
    const scores: Score[] = [
      // Cindy (reps): B 300, A 250, C 250, D 180
      score('A', 'cindy', { reps: 250 }),
      score('B', 'cindy', { reps: 300 }),
      score('C', 'cindy', { reps: 250 }),
      score('D', 'cindy', { reps: 180 }),
      // Grace (time, cap 5:00): A 200s, D 200s (finishers, tie), B 240s, C capped 22 reps
      score('A', 'grace', { timeSeconds: 200 }),
      score('D', 'grace', { timeSeconds: 200 }),
      score('B', 'grace', { timeSeconds: 240 }),
      score('C', 'grace', { timeSeconds: undefined, reps: 22 }),
      // Deadlift (load): B 200, A 180, C 170, D absent
      score('A', 'deadlift', { loadKg: 180 }),
      score('B', 'deadlift', { loadKg: 200 }),
      score('C', 'deadlift', { loadKg: 170 }),
      score('D', 'deadlift', { status: 'absent' }),
    ];

    // Per-WOD placements
    const cindy = placements(rankWod(wods[0], athletes, scores));
    expect(cindy).toEqual({ B: 1, A: 2.5, C: 2.5, D: 4 });

    const grace = placements(rankWod(wods[1], athletes, scores));
    expect(grace).toEqual({ A: 1.5, D: 1.5, B: 3, C: 4 });

    const deadlift = placements(rankWod(wods[2], athletes, scores));
    expect(deadlift).toEqual({ B: 1, A: 2, C: 3, D: 4 });

    // Overall
    const comp: Competition = {
      id: 'c1',
      name: 'Throwdown',
      date: '2026-02-01',
      wodIds: ['cindy', 'grace', 'deadlift'],
      athleteIds: ['A', 'B', 'C', 'D'],
    };
    const rx = overallStandings(comp, { divisions, athletes, wods, scores })[0].standings;

    const byId = Object.fromEntries(rx.map((s) => [s.athleteId, s]));
    expect(byId.A.total).toBeCloseTo(6.0);
    expect(byId.B.total).toBeCloseTo(5.0);
    expect(byId.C.total).toBeCloseTo(9.5);
    expect(byId.D.total).toBeCloseTo(9.5);

    // Final order: B(1st), A(2nd), then D beats C on countback (D's best placing 1.5 < C's 2.5)
    expect(rx.map((s) => s.athleteId)).toEqual(['B', 'A', 'D', 'C']);
    expect(byId.B.rank).toBe(1);
    expect(byId.A.rank).toBe(2);
    expect(byId.D.rank).toBe(3);
    expect(byId.C.rank).toBe(4);
  });
});
