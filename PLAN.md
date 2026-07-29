# WOD Ranker — CrossFit Competition Scoring App

## Context

The user runs CrossFit competitions and needs a mobile app to score them — but wants
**no app store, no server, no cost**: a single web app deployed on GitHub Pages, opened
directly on their phone (installable to the home screen, works offline).

The job the app does: manage **athletes** and **WODs**, build a **competition** out of
several WODs, enter each athlete's **score per WOD**, and produce a live **overall
leaderboard** ranking every competitor across all WODs.

Design must feel **crafted, not "vibe-coded"** — a custom **Chalkboard / Whiteboard**
visual system (off-white paper, crimson accent, navy ink), simple to use, and fast.

Confirmed decisions (from brainstorming):
- Overall ranking = **points by rank** (each WOD scored separately into placements).
- Points scheme = **placement points, lowest total wins** (1st = 1 pt … golf style).
- Tie-break = **best-placings countback**.
- WOD types = **Reps/AMRAP**, **For Time + time cap**, **Max Load**.
- **Divisions** supported (rankings computed per division).
- Storage = **on-phone (localStorage)** + **Export/Import backup file**.
- Visual style = **Chalkboard / Whiteboard**.

---

## Tech stack

- **Vite + React + TypeScript** — small optimized bundle, fast, maintainable.
- **Tailwind CSS** — custom design tokens (the chalkboard palette), no generic UI kit.
- **React Router** (hash-based) — works on GitHub Pages with no server rewrites.
- **vite-plugin-pwa** — installable "Add to Home Screen", offline caching.
- **Self-hosted fonts** (bundled locally) — display + body, so it works fully offline.
- **No backend.** State in React context, persisted to `localStorage`. Pure-function
  scoring engine (easy to test, easy to keep fast via memoization).
- Deploy via **GitHub Actions → GitHub Pages**. Vite `base: './'` (relative) so it works
  under any repo name without hardcoding.

---

## Data model (`src/types.ts`)

```ts
type WodType = 'reps' | 'time' | 'load';

interface Athlete { id: string; name: string; divisionId: string; }
interface Division { id: string; name: string; }         // e.g. "Men Rx", "Women Scaled"

interface Wod {
  id: string; name: string; description?: string;
  type: WodType;
  timeCapSeconds?: number;   // required for 'time'
}

interface Competition {
  id: string; name: string; date: string;
  wodIds: string[];
  athleteIds: string[];      // who is entered
}

// One athlete's result in one WOD of one competition
interface Score {
  competitionId: string; wodId: string; athleteId: string;
  status: 'done' | 'dnf' | 'absent';
  reps?: number;             // reps type; OR reps done at cap for a capped 'time' WOD
  timeSeconds?: number;      // 'time' type, only if finished
  loadKg?: number;           // 'load' type
}
```

Global store shape: `{ divisions, athletes, wods, competitions, scores }`, all persisted
under one `localStorage` key (`wodranker:v1`).

---

## Scoring engine (`src/scoring.ts`) — pure functions, unit-tested first (TDD)

This is the heart of the app. Ranking is always computed **within a division** (athletes
compete only against others in their division).

**1. Per-WOD placement** — for a given WOD + division, sort athletes best→worst:
- `reps`  → higher reps first.
- `load`  → higher kg first.
- `time`  → **finishers first** (status `done` with `timeSeconds`), fastest time first;
  then **non-finishers** (capped), more reps done first. Finishers always rank above
  non-finishers. This is the time-cap rule.
- `absent` / `dnf` / missing score → sorted to the **bottom**.
- **Ties** (identical result): share the **average of the positions they occupy**
  (e.g. two tied for 2nd/3rd both get 2.5 placement points). Standard, fair.

Placement points = the athlete's position number (1, 2, 3…). Missing/absent score in a
scored WOD = **last place** for that WOD.

**2. Overall standings** — per division, sum each athlete's placement points across all
WODs in the competition. **Lowest total wins.**

**3. Tie-break (countback)** — equal totals resolved by comparing each athlete's sorted
list of placements: more 1sts wins; if equal, more 2nds; and so on. If still identical,
they genuinely share the rank.

Key functions (all pure): `rankWod(wod, athletes, scores) → RankedRow[]`,
`overallStandings(competition, ...) → Standing[]` (grouped by division).

---

## Screens & components

Bottom tab navigation (thumb-friendly on phone): **Athletes · WODs · Competitions**.

- **Athletes** — list grouped by division; add/edit/delete; manage divisions.
- **WODs** — library of workouts; add/edit with type picker (reps/time/load) and time cap.
- **Competition detail** — pick WODs + athletes; tabs for each WOD's **score entry**
  (input adapts to WOD type) and the **Leaderboard** (overall per division + per-WOD).
- **Settings / Backup** — Export (download JSON) / Import (restore JSON), reset.

Reusable UI: `Card`, `TabBar`, `RankBadge` (gold/silver/bronze top-3), `EmptyState`,
score inputs per type (`RepsInput`, `TimeInput` with finished toggle, `LoadInput`).

---

## Chalkboard design system (`tailwind.config` tokens + `src/index.css`)

- **paper** `#F6F3EC` (bg), **card** `#FFFFFF`, **ink** `#1B2430` (text),
  **accent/crimson** `#D7263D`, **gold** `#E4A400`, muted `#8A8577`, hairline borders.
- **Display font** (condensed, bold — e.g. Archivo/Oswald) for headings & ranks; clean
  sans (e.g. Inter) for body. Bundled locally.
- Whiteboard cues: hairline rules under section titles, division "marker" dots, generous
  spacing, large tap targets, subtle paper texture. Full light theme.

---

## Persistence, PWA & deployment

- `useStore` hook wraps context + `localStorage` (debounced writes for performance).
- Export = `Blob` download of the store JSON; Import = file read + validate + replace.
- `manifest.webmanifest` + icons + service worker (vite-plugin-pwa) → installable, offline.
- `.github/workflows/deploy.yml`: on push to `main`, `npm ci && npm run build`, publish
  `dist/` to GitHub Pages. README documents enabling Pages (Source = GitHub Actions).

---

## Documentation deliverables

- **`design.md`** — living design doc (this design, palette, data model, scoring rules)
  so changes can be requested against it later.
- **`README.md`** — setup + deploy instructions **and a full "Ranking Rules" section**
  spelling out every rule above in plain language (per-WOD ranking for each type, the
  time-cap rule, placement points / lowest-wins, missing-score = last, countback tie-break)
  with a worked example.

---

## Build order

1. Scaffold Vite + React + TS + Tailwind; chalkboard tokens & fonts; shell + TabBar.
2. `types.ts` + `useStore` (localStorage persistence).
3. **`scoring.ts` via TDD** — write tests for every rule/type/tie case first, then implement.
4. Athletes + Divisions screen.
5. WODs screen.
6. Competitions: create, pick WODs/athletes, per-type score entry.
7. Leaderboard (overall per division + per-WOD breakdown, medal badges).
8. Settings: Export/Import backup.
9. PWA manifest + service worker + icons.
10. GitHub Actions deploy workflow.
11. Write `design.md` and `README.md` (rules + worked example).

---

## Verification

- **Unit**: `scoring.ts` test suite covers each WOD type, the finisher-vs-capped ordering,
  ties (averaged placements), missing-score-as-last, lowest-wins totals, and countback.
  Seed the worked example from the README as a test → its output must match.
- **End-to-end (real app)**: `npm run dev`, then drive it in the browser — create 2
  divisions, ~4 athletes, 3 WODs (one of each type incl. a time cap), a competition, enter
  scores, and confirm the leaderboard matches a hand-calculation. Test Export → clear →
  Import round-trip. Check mobile viewport layout and installability.
- **Deploy**: confirm the Actions build succeeds and the Pages URL loads on the phone.
