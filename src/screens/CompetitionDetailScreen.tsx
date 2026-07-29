import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Card, EmptyState, MarkerDot, TypePill } from '../components/ui';
import { ScoreRow } from '../components/ScoreEntry';
import { Leaderboard } from '../components/Leaderboard';
import { formatDate } from './CompetitionsScreen';
import { formatTime } from '../lib/format';

type Tab = 'setup' | 'board' | string; // string = a wodId

export function CompetitionDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, updateCompetition, deleteCompetition, setScore, clearScore } = useStore();
  const competition = state.competitions.find((c) => c.id === id);
  const [tab, setTab] = useState<Tab>('setup');

  const wods = useMemo(
    () =>
      competition
        ? competition.wodIds
            .map((wid) => state.wods.find((w) => w.id === wid))
            .filter((w): w is NonNullable<typeof w> => Boolean(w))
        : [],
    [competition, state.wods],
  );

  if (!competition) {
    return (
      <div className="space-y-4">
        <EmptyState icon="?" title="Competition not found" />
        <button className="btn-ghost w-full" onClick={() => navigate('/competitions')}>
          Back to competitions
        </button>
      </div>
    );
  }

  const enteredAthletes = state.athletes.filter((a) => competition.athleteIds.includes(a.id));
  const scoreFor = (wodId: string, athleteId: string) =>
    state.scores.find(
      (s) => s.competitionId === competition.id && s.wodId === wodId && s.athleteId === athleteId,
    );

  return (
    <div className="space-y-4">
      <button className="text-sm font-600 text-muted" onClick={() => navigate('/competitions')}>
        ‹ Competitions
      </button>

      <div>
        <h1 className="font-display text-2xl font-700 uppercase tracking-tight text-ink">
          {competition.name}
        </h1>
        <p className="text-sm text-muted">{formatDate(competition.date)}</p>
      </div>

      {/* In-screen tabs: Setup · each WOD · Leaderboard */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <SubTab active={tab === 'setup'} onClick={() => setTab('setup')}>
          Setup
        </SubTab>
        {wods.map((w) => (
          <SubTab key={w.id} active={tab === w.id} onClick={() => setTab(w.id)}>
            {w.name}
          </SubTab>
        ))}
        <SubTab active={tab === 'board'} onClick={() => setTab('board')}>
          🏆 Leaderboard
        </SubTab>
      </div>

      {tab === 'setup' && (
        <SetupTab
          competition={competition}
          onToggleWod={(wid) =>
            updateCompetition(competition.id, {
              wodIds: competition.wodIds.includes(wid)
                ? competition.wodIds.filter((x) => x !== wid)
                : [...competition.wodIds, wid],
            })
          }
          onToggleAthlete={(aid) =>
            updateCompetition(competition.id, {
              athleteIds: competition.athleteIds.includes(aid)
                ? competition.athleteIds.filter((x) => x !== aid)
                : [...competition.athleteIds, aid],
            })
          }
          onDelete={() => {
            if (confirm(`Delete "${competition.name}" and all its scores?`)) {
              deleteCompetition(competition.id);
              navigate('/competitions');
            }
          }}
        />
      )}

      {tab === 'board' && <Leaderboard competition={competition} state={state} />}

      {wods.map(
        (w) =>
          tab === w.id && (
            <div key={w.id} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <TypePill type={w.type} />
                {w.type === 'time' && w.timeCapSeconds != null && (
                  <span className="text-sm text-muted">Cap {formatTime(w.timeCapSeconds)}</span>
                )}
              </div>
              {w.description && <p className="text-sm text-muted">{w.description}</p>}

              {enteredAthletes.length === 0 ? (
                <EmptyState icon="✎" title="No athletes entered" hint="Add athletes in Setup to score this WOD." />
              ) : (
                groupByDivision(enteredAthletes, state).map(({ division, athletes }) => (
                  <div key={division.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-1 pt-1">
                      <MarkerDot id={division.id} />
                      <span className="font-display text-sm font-600 uppercase tracking-wide text-muted">
                        {division.name}
                      </span>
                    </div>
                    {athletes.map((a) => (
                      <ScoreRow
                        key={a.id}
                        competitionId={competition.id}
                        wod={w}
                        athlete={a}
                        score={scoreFor(w.id, a.id)}
                        onSet={setScore}
                        onClear={() => clearScore(competition.id, w.id, a.id)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SetupTab({
  competition,
  onToggleWod,
  onToggleAthlete,
  onDelete,
}: {
  competition: import('../types').Competition;
  onToggleWod: (wid: string) => void;
  onToggleAthlete: (aid: string) => void;
  onDelete: () => void;
}) {
  const { state } = useStore();
  const grouped = groupByDivision(state.athletes, state);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="section-title text-base">WODs in this competition</h3>
        <div className="hairline-rule" />
        {state.wods.length === 0 ? (
          <p className="pt-2 text-sm text-muted">No WODs yet — add some on the WODs tab.</p>
        ) : (
          state.wods.map((w) => {
            const on = competition.wodIds.includes(w.id);
            return (
              <Card key={w.id} onClick={() => onToggleWod(w.id)} className="flex items-center gap-3">
                <Checkbox on={on} />
                <span className="flex-1 truncate font-500 text-ink">{w.name}</span>
                <TypePill type={w.type} />
              </Card>
            );
          })
        )}
      </section>

      <section className="space-y-2">
        <h3 className="section-title text-base">Athletes entered</h3>
        <div className="hairline-rule" />
        {state.athletes.length === 0 ? (
          <p className="pt-2 text-sm text-muted">No athletes yet — add some on the Athletes tab.</p>
        ) : (
          grouped.map(({ division, athletes }) => (
            <div key={division.id} className="space-y-2 pt-1">
              <div className="flex items-center gap-2 px-1">
                <MarkerDot id={division.id} />
                <span className="font-display text-sm font-600 uppercase tracking-wide text-muted">
                  {division.name}
                </span>
              </div>
              {athletes.map((a) => {
                const on = competition.athleteIds.includes(a.id);
                return (
                  <Card key={a.id} onClick={() => onToggleAthlete(a.id)} className="flex items-center gap-3">
                    <Checkbox on={on} />
                    <span className="flex-1 truncate font-500 text-ink">{a.name}</span>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </section>

      <div className="hairline-rule" />
      <button className="btn-danger w-full" onClick={onDelete}>
        Delete competition
      </button>
    </div>
  );
}

function Checkbox({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
        on ? 'border-crimson bg-crimson text-white' : 'border-hairline bg-paper text-transparent'
      }`}
      aria-hidden
    >
      ✓
    </span>
  );
}

function SubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 font-display text-sm font-600 uppercase tracking-wide transition ${
        active ? 'border-ink bg-ink text-white' : 'border-hairline bg-card text-muted'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Group a list of athletes by their division, preserving division definition order.
function groupByDivision(
  athletes: import('../types').Athlete[],
  state: import('../types').StoreState,
) {
  return state.divisions
    .map((division) => ({
      division,
      athletes: athletes
        .filter((a) => a.divisionId === division.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.athletes.length > 0);
}
