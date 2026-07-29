import { useState } from 'react';
import { useStore } from '../store';
import { Card, EmptyState, SectionTitle, TypePill, WOD_TYPE_LABEL } from '../components/ui';
import { Sheet } from '../components/Modal';
import { TimeField } from '../components/TimePicker';
import { formatTime } from '../lib/format';
import type { Wod, WodType } from '../types';

const TYPES: WodType[] = ['reps', 'time', 'load'];

const TYPE_HINT: Record<WodType, string> = {
  reps: 'Most reps wins (AMRAP / rep count).',
  time: 'Fastest time wins; capped athletes rank below finishers by reps done.',
  load: 'Heaviest load wins (max lift).',
};

export function WodsScreen() {
  const { state, addWod, updateWod, deleteWod } = useStore();
  const [sheet, setSheet] = useState<{ wod?: Wod } | null>(null);

  return (
    <div className="space-y-5">
      <SectionTitle>WODs</SectionTitle>

      {state.wods.length === 0 ? (
        <EmptyState
          icon="🏋"
          title="No workouts yet"
          hint="Build a library of WODs. Pick a type — reps, for time, or max load — and reuse them across competitions."
          action={
            <button className="btn-primary" onClick={() => setSheet({})}>
              Add your first WOD
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {state.wods.map((w) => (
              <Card key={w.id} onClick={() => setSheet({ wod: w })}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-600 text-ink">{w.name}</div>
                    {w.description && <div className="mt-0.5 line-clamp-2 text-sm text-muted">{w.description}</div>}
                  </div>
                  <TypePill type={w.type} />
                </div>
                {w.type === 'time' && w.timeCapSeconds != null && (
                  <div className="mt-2 text-sm text-muted">Cap {formatTime(w.timeCapSeconds)}</div>
                )}
              </Card>
            ))}
          </div>
          <button className="btn-primary w-full" onClick={() => setSheet({})}>
            + Add WOD
          </button>
        </>
      )}

      {sheet && (
        <WodSheet
          wod={sheet.wod}
          onClose={() => setSheet(null)}
          onSave={(data) => {
            if (sheet.wod) updateWod(sheet.wod.id, data);
            else addWod(data);
            setSheet(null);
          }}
          onDelete={
            sheet.wod
              ? () => {
                  deleteWod(sheet.wod!.id);
                  setSheet(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function WodSheet({
  wod,
  onClose,
  onSave,
  onDelete,
}: {
  wod?: Wod;
  onClose: () => void;
  onSave: (data: Omit<Wod, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(wod?.name ?? '');
  const [description, setDescription] = useState(wod?.description ?? '');
  const [type, setType] = useState<WodType>(wod?.type ?? 'reps');
  const [cap, setCap] = useState<number | null>(wod?.timeCapSeconds ?? null);

  const capSeconds = type === 'time' ? cap : null;
  const valid = name.trim() !== '' && (type !== 'time' || (capSeconds != null && capSeconds > 0));

  return (
    <Sheet
      open
      onClose={onClose}
      title={wod ? 'Edit WOD' : 'Add WOD'}
      footer={
        <>
          {onDelete && (
            <button className="btn-danger" onClick={() => confirm('Delete this WOD and its scores?') && onDelete()}>
              Delete
            </button>
          )}
          <button
            className="btn-primary flex-1"
            disabled={!valid}
            onClick={() =>
              onSave({
                name: name.trim(),
                description: description.trim() || undefined,
                type,
                timeCapSeconds: type === 'time' ? (capSeconds ?? undefined) : undefined,
              })
            }
          >
            Save
          </button>
        </>
      }
    >
      <div>
        <label className="label">Name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fran" autoFocus />
      </div>

      <div>
        <label className="label">Type</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`rounded-xl border px-2 py-3 text-center transition ${
                type === t ? 'border-crimson bg-crimson/5 text-crimson' : 'border-hairline bg-card text-ink'
              }`}
              onClick={() => setType(t)}
            >
              <div className="font-display text-sm font-600 uppercase">{WOD_TYPE_LABEL[t]}</div>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">{TYPE_HINT[type]}</p>
      </div>

      {type === 'time' && (
        <div>
          <div className="label">Time cap</div>
          <TimeField value={cap} onChange={setCap} title="Time cap" placeholder="Tap to set the cap" />
          <p className="mt-1.5 text-xs text-muted">
            When the cap clock hits, everyone stops — no finish time can be above it.
          </p>
        </div>
      )}

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          className="field min-h-[80px] resize-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Movements, rep scheme, standards…"
        />
      </div>
    </Sheet>
  );
}
