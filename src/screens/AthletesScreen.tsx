import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { Card, EmptyState, MarkerDot, SectionTitle } from '../components/ui';
import { Sheet } from '../components/Modal';
import type { Athlete, Division } from '../types';

export function AthletesScreen() {
  const { state, addAthlete, updateAthlete, deleteAthlete, addDivision } = useStore();
  const [athleteSheet, setAthleteSheet] = useState<{ athlete?: Athlete } | null>(null);
  const [divisionsOpen, setDivisionsOpen] = useState(false);

  const grouped = useMemo(() => {
    return state.divisions.map((d) => ({
      division: d,
      athletes: state.athletes
        .filter((a) => a.divisionId === d.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [state.divisions, state.athletes]);

  const noDivisions = state.divisions.length === 0;

  return (
    <div className="space-y-5">
      <SectionTitle
        right={
          <button className="text-sm font-600 uppercase tracking-wide text-crimson" onClick={() => setDivisionsOpen(true)}>
            Divisions
          </button>
        }
      >
        Athletes
      </SectionTitle>

      {noDivisions ? (
        <EmptyState
          icon="◎"
          title="Create a division first"
          hint="Athletes compete within a division (e.g. Men Rx, Women Scaled). Add one to get started."
          action={
            <button className="btn-primary" onClick={() => setDivisionsOpen(true)}>
              Manage divisions
            </button>
          }
        />
      ) : (
        <>
          {grouped.map(({ division, athletes }) => (
            <div key={division.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <MarkerDot id={division.id} />
                <span className="font-display text-sm font-600 uppercase tracking-wide text-muted">
                  {division.name}
                </span>
                <span className="text-xs text-muted">· {athletes.length}</span>
              </div>
              {athletes.length === 0 ? (
                <p className="px-1 text-sm text-muted">No athletes yet.</p>
              ) : (
                athletes.map((a) => (
                  <Card key={a.id} onClick={() => setAthleteSheet({ athlete: a })} className="flex items-center justify-between">
                    <span className="font-500 text-ink">{a.name}</span>
                    <span className="text-sm text-muted">Edit ›</span>
                  </Card>
                ))
              )}
            </div>
          ))}

          <button className="btn-primary w-full" onClick={() => setAthleteSheet({})}>
            + Add athlete
          </button>
        </>
      )}

      {athleteSheet && (
        <AthleteSheet
          athlete={athleteSheet.athlete}
          divisions={state.divisions}
          onClose={() => setAthleteSheet(null)}
          onSave={(name, divisionId) => {
            if (athleteSheet.athlete) updateAthlete(athleteSheet.athlete.id, { name, divisionId });
            else addAthlete(name, divisionId);
            setAthleteSheet(null);
          }}
          onDelete={
            athleteSheet.athlete
              ? () => {
                  deleteAthlete(athleteSheet.athlete!.id);
                  setAthleteSheet(null);
                }
              : undefined
          }
        />
      )}

      {divisionsOpen && (
        <DivisionsSheet onClose={() => setDivisionsOpen(false)} onAdd={(name) => addDivision(name)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function AthleteSheet({
  athlete,
  divisions,
  onClose,
  onSave,
  onDelete,
}: {
  athlete?: Athlete;
  divisions: Division[];
  onClose: () => void;
  onSave: (name: string, divisionId: string) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(athlete?.name ?? '');
  const [divisionId, setDivisionId] = useState(athlete?.divisionId ?? divisions[0]?.id ?? '');
  const valid = name.trim() !== '' && divisionId !== '';

  return (
    <Sheet
      open
      onClose={onClose}
      title={athlete ? 'Edit athlete' : 'Add athlete'}
      footer={
        <>
          {onDelete && (
            <button className="btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <button className="btn-primary flex-1" disabled={!valid} onClick={() => onSave(name.trim(), divisionId)}>
            Save
          </button>
        </>
      }
    >
      <div>
        <label className="label">Name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Athlete name" autoFocus />
      </div>
      <div>
        <label className="label">Division</label>
        <div className="flex flex-wrap gap-2">
          {divisions.map((d) => (
            <button
              key={d.id}
              className={divisionId === d.id ? 'chip-active' : 'chip'}
              onClick={() => setDivisionId(d.id)}
            >
              <MarkerDot id={d.id} />
              {d.name}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function DivisionsSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const { state, updateDivision, deleteDivision } = useStore();
  const [newName, setNewName] = useState('');

  return (
    <Sheet open onClose={onClose} title="Divisions">
      <div className="space-y-2">
        {state.divisions.length === 0 && <p className="text-sm text-muted">No divisions yet.</p>}
        {state.divisions.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <MarkerDot id={d.id} />
            <input
              className="field flex-1"
              value={d.name}
              onChange={(e) => updateDivision(d.id, { name: e.target.value })}
            />
            <button
              className="rounded-lg px-3 py-2 text-sm font-600 text-crimson"
              onClick={() => {
                if (confirm(`Delete "${d.name}" and its athletes & scores?`)) deleteDivision(d.id);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <input
          className="field flex-1"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New division name"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              onAdd(newName.trim());
              setNewName('');
            }
          }}
        />
        <button
          className="btn-primary"
          disabled={!newName.trim()}
          onClick={() => {
            onAdd(newName.trim());
            setNewName('');
          }}
        >
          Add
        </button>
      </div>
    </Sheet>
  );
}
