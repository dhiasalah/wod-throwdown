import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, EmptyState, SectionTitle } from '../components/ui';
import { Sheet } from '../components/Modal';

export function CompetitionsScreen() {
  const { state, addCompetition } = useStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const comps = [...state.competitions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <SectionTitle>Competitions</SectionTitle>

      {comps.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No competitions yet"
          hint="Create a competition, pick its WODs and athletes, then enter scores to see a live leaderboard."
          action={
            <button className="btn-primary" onClick={() => setCreating(true)}>
              New competition
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {comps.map((c) => (
              <Card key={c.id} onClick={() => navigate(`/competitions/${c.id}`)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-600 text-ink">{c.name}</div>
                    <div className="mt-0.5 text-sm text-muted">
                      {formatDate(c.date)} · {c.wodIds.length} WODs · {c.athleteIds.length} athletes
                    </div>
                  </div>
                  <span className="text-muted">›</span>
                </div>
              </Card>
            ))}
          </div>
          <button className="btn-primary w-full" onClick={() => setCreating(true)}>
            + New competition
          </button>
        </>
      )}

      {creating && (
        <CreateSheet
          onClose={() => setCreating(false)}
          onCreate={(name, date) => {
            const c = addCompetition({ name, date });
            setCreating(false);
            navigate(`/competitions/${c.id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateSheet({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, date: string) => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <Sheet
      open
      onClose={onClose}
      title="New competition"
      footer={
        <button
          className="btn-primary flex-1"
          disabled={name.trim() === ''}
          onClick={() => onCreate(name.trim(), date)}
        >
          Create
        </button>
      }
    >
      <div>
        <label className="label">Name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Throwdown" autoFocus />
      </div>
      <div>
        <label className="label">Date</label>
        <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </Sheet>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
