import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Card, SectionTitle } from '../components/ui';
import { normalizeState } from '../store';
import type { StoreState } from '../types';

export function SettingsScreen() {
  const { state, replaceAll, reset } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const counts = {
    divisions: state.divisions.length,
    athletes: state.athletes.length,
    wods: state.wods.length,
    competitions: state.competitions.length,
    scores: state.scores.length,
  };

  function handleExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `wod-ranker-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ kind: 'ok', text: 'Backup downloaded.' });
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const next = normalizeState(parsed) as StoreState;
      const total =
        next.divisions.length + next.athletes.length + next.wods.length + next.competitions.length;
      if (total === 0 && next.scores.length === 0) {
        setMessage({ kind: 'err', text: 'That file has no WOD Ranker data.' });
        return;
      }
      if (
        confirm(
          'Importing replaces ALL current data with the backup. Continue?',
        )
      ) {
        replaceAll(next);
        setMessage({ kind: 'ok', text: 'Backup restored.' });
      }
    } catch {
      setMessage({ kind: 'err', text: 'Could not read that file — is it a valid backup?' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Backup &amp; Data</SectionTitle>

      <Card>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-muted">Divisions</span>
          <span className="text-right font-600">{counts.divisions}</span>
          <span className="text-muted">Athletes</span>
          <span className="text-right font-600">{counts.athletes}</span>
          <span className="text-muted">WODs</span>
          <span className="text-right font-600">{counts.wods}</span>
          <span className="text-muted">Competitions</span>
          <span className="text-right font-600">{counts.competitions}</span>
          <span className="text-muted">Scores</span>
          <span className="text-right font-600">{counts.scores}</span>
        </div>
      </Card>

      <p className="px-1 text-sm text-muted">
        Everything lives on this phone (offline). Export a backup file to keep it safe or move it to
        another device.
      </p>

      <div className="space-y-3">
        <button className="btn-primary w-full" onClick={handleExport}>
          ⭳ Export backup
        </button>
        <button className="btn-ghost w-full" onClick={() => fileRef.current?.click()}>
          ⭱ Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
          }}
        />
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.kind === 'ok'
              ? 'border-hairline bg-card text-ink'
              : 'border-crimson/40 bg-crimson/5 text-crimson'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="hairline-rule" />

      <button
        className="btn-danger w-full"
        onClick={() => {
          if (confirm('Erase ALL data on this device? This cannot be undone (export a backup first).')) {
            reset();
            setMessage({ kind: 'ok', text: 'All data cleared.' });
          }
        }}
      >
        Reset — erase all data
      </button>

      <p className="pb-2 text-center text-xs text-muted">WOD Ranker · offline · v1</p>
    </div>
  );
}
