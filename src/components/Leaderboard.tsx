import { useMemo, useState } from 'react';
import type { Competition, StoreState } from '../types';
import { overallStandings, rankWod, type DivisionStandings } from '../scoring';
import { RankBadge, MarkerDot, EmptyState } from './ui';
import { formatPlacement, ordinal } from '../lib/format';
import { formatResult } from '../lib/result';

export function Leaderboard({
  competition,
  state,
}: {
  competition: Competition;
  state: StoreState;
}) {
  const wods = useMemo(
    () =>
      competition.wodIds
        .map((id) => state.wods.find((w) => w.id === id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w)),
    [competition.wodIds, state.wods],
  );

  const divisionStandings = useMemo<DivisionStandings[]>(
    () => overallStandings(competition, state),
    [competition, state],
  );

  const [view, setView] = useState<'overall' | string>('overall'); // 'overall' or a wodId

  const athleteName = (id: string) => state.athletes.find((a) => a.id === id)?.name ?? '—';

  if (competition.athleteIds.length === 0 || wods.length === 0) {
    return (
      <EmptyState
        icon="🏁"
        title="Leaderboard is empty"
        hint="Add WODs and athletes in Setup, then enter scores — standings appear here live."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* View switcher: Overall + per-WOD */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <ViewChip active={view === 'overall'} onClick={() => setView('overall')}>
          Overall
        </ViewChip>
        {wods.map((w) => (
          <ViewChip key={w.id} active={view === w.id} onClick={() => setView(w.id)}>
            {w.name}
          </ViewChip>
        ))}
      </div>

      {view === 'overall'
        ? divisionStandings.map((ds) => (
            <div key={ds.divisionId} className="space-y-2">
              <DivisionHeader id={ds.divisionId} name={ds.divisionName} />
              {ds.standings.map((s) => (
                <div key={s.athleteId} className="card flex items-center gap-3 p-3">
                  <RankBadge rank={s.rank} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-500 text-ink">{athleteName(s.athleteId)}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {s.placements.map((p, i) => (
                        <span
                          key={i}
                          className="rounded bg-paper px-1.5 py-0.5 text-[11px] font-600 text-muted"
                          title={wods[i]?.name}
                        >
                          {wods[i]?.name?.slice(0, 6)} {formatPlacement(p)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-xl font-700 leading-none text-ink">
                      {formatPlacement(s.total)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">pts</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        : (() => {
            const wod = wods.find((w) => w.id === view)!;
            // Rank per division for this single WOD.
            const compScores = state.scores.filter((s) => s.competitionId === competition.id);
            const enteredDivs = Array.from(
              new Set(
                state.athletes
                  .filter((a) => competition.athleteIds.includes(a.id))
                  .map((a) => a.divisionId),
              ),
            );
            return enteredDivs.map((divId) => {
              const divAthletes = state.athletes.filter(
                (a) => a.divisionId === divId && competition.athleteIds.includes(a.id),
              );
              const rows = rankWod(wod, divAthletes, compScores);
              const division = state.divisions.find((d) => d.id === divId);
              return (
                <div key={divId} className="space-y-2">
                  <DivisionHeader id={divId} name={division?.name ?? '—'} />
                  {rows
                    .slice()
                    .sort((a, b) => a.placement - b.placement)
                    .map((r) => (
                      <div key={r.athleteId} className="card flex items-center gap-3 p-3">
                        <RankBadge rank={r.rankOrder} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-500 text-ink">{athleteName(r.athleteId)}</div>
                          <div className="text-sm text-muted">{formatResult(wod, r.score)}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-display text-lg font-700 leading-none text-ink">
                            {ordinal(r.rankOrder)}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-muted">
                            {formatPlacement(r.placement)} pts
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              );
            });
          })()}
    </div>
  );
}

function DivisionHeader({ id, name }: { id: string; name: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-1">
      <MarkerDot id={id} />
      <span className="font-display text-sm font-600 uppercase tracking-wide text-muted">{name}</span>
    </div>
  );
}

function ViewChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={`${active ? 'chip-active' : 'chip'} shrink-0 whitespace-nowrap`} onClick={onClick}>
      {children}
    </button>
  );
}
