# WOD Ranker — Design Document

A living design doc. Request changes against **this file**, then against the code.

## 1. Purpose

A phone-first web app to score CrossFit-style competitions with **no app store, no
server, no cost**. It is a single static site (deployable to GitHub Pages), installable
to the home screen, and fully usable **offline**. All data lives on the phone.

The job it does: manage **athletes** and **WODs**, assemble a **competition** from
several WODs, enter each athlete's **score per WOD**, and produce a live **overall
leaderboard** ranking every competitor — computed **within each division**.

## 2. Confirmed decisions

- Overall ranking = **points by rank** — each WOD is scored separately into placements.
- Points scheme = **placement points, lowest total wins** (1st = 1pt, golf style).
- Tie-break = **best-placings countback**.
- WOD types = **Reps / AMRAP**, **For Time + time cap**, **Max Load**.
- **Divisions** supported — rankings are computed per division.
- Storage = **on-phone (localStorage)** + **Export / Import** backup file.
- Visual style = **Chalkboard / Whiteboard**.

## 3. Visual system — Chalkboard / Whiteboard

Feels crafted, not generic. Full light theme.

| Token       | Value     | Use                         |
| ----------- | --------- | --------------------------- |
| `paper`     | `#F6F3EC` | Page background (off-white) |
| `card`      | `#FFFFFF` | Card surfaces               |
| `ink`       | `#1B2430` | Primary text (navy)         |
| `crimson`   | `#D7263D` | Accent / primary action     |
| `gold`      | `#E4A400` | 1st place                   |
| `silver`    | `#9AA3AD` | 2nd place                   |
| `bronze`    | `#B07B3E` | 3rd place                   |
| `muted`     | `#8A8577` | Secondary text              |
| `hairline`  | `#E4DFD3` | Borders / rules             |

- **Display font:** Oswald (condensed, bold) — headings, ranks, buttons.
- **Body font:** Inter — everything else.
- Both **self-hosted** (bundled via `@fontsource`) so they work offline.
- Whiteboard cues: hairline rules under section titles, division **marker dots**,
  a faint paper speckle texture, generous spacing, large (≥48px) tap targets.

## 4. Data model (`src/types.ts`)

```ts
type WodType = 'reps' | 'time' | 'load';
type ScoreStatus = 'done' | 'dnf' | 'absent';

interface Division { id; name; }
interface Athlete  { id; name; divisionId; }
interface Wod      { id; name; description?; type: WodType; timeCapSeconds?; }
interface Competition { id; name; date; wodIds: string[]; athleteIds: string[]; }

interface Score {
  competitionId; wodId; athleteId;
  status: ScoreStatus;
  reps?;         // 'reps' type, OR reps done at cap for a capped 'time' WOD
  timeSeconds?;  // 'time' type, only when finished
  loadKg?;       // 'load' type
}
```

Global store shape `{ divisions, athletes, wods, competitions, scores }` is persisted
under one localStorage key: **`wodranker:v1`** (debounced writes).

## 5. Scoring engine (`src/scoring.ts`)

Pure functions, unit-tested first (TDD). Ranking is **always within a division**.

### Per-WOD placement — `rankWod(wod, athletes, scores)`

Sort athletes best → worst:

- **reps** → higher reps first.
- **load** → higher kg first.
- **time** → **finishers first** (status `done` with `timeSeconds`), fastest first;
  then **capped non-finishers** (status `done` with `reps`, no time), more reps first.
  Finishers always rank above capped athletes.
  The time cap is a **hard ceiling**: when the cap clock hits, everyone stops, so a
  finish time can never exceed `timeCapSeconds`. This is enforced at entry (the wheels
  stop at the cap) rather than in the ranker.
- `absent` / `dnf` / **missing** → sorted to the **bottom** (they tie for last).
- **Ties** (identical result) share the **average of the positions they occupy**
  (two tied for 2nd/3rd → 2.5 each).

Placement points = the athlete's position number. Missing score in a scored WOD = last.

### Overall standings — `overallStandings(competition, data)`

Per division: sum each athlete's placement points across all WODs. **Lowest total wins.**

### Tie-break — countback

Equal totals are resolved by comparing each athlete's placements sorted ascending:
the smaller (better) placing wins — more/better 1sts, then 2nds, and so on. If still
identical, they genuinely share the rank.

The implementation is exercised by `src/scoring.test.ts`, whose "README worked example"
test must match the example in `README.md`.

## 6. Screens

Bottom tab navigation: **Athletes · WODs · Comps · Backup**.

- **Athletes** — grouped by division; add/edit/delete; manage divisions.
- **WODs** — workout library; add/edit with type picker + time cap.
- **Competitions** — list + create. **Detail**: in-page tabs for **Setup** (pick WODs &
  athletes), one tab **per WOD** (score entry, input adapts to type), and **Leaderboard**
  (overall per division + per-WOD breakdown with medal badges).
  Each WOD tab carries a **`ScoreLegend`** spelling out FIN / CAP / DNF / ABS — the four
  mode buttons are the whole scoring interface, so they are never shown unexplained.
- **Backup** — Export (download JSON) / Import (restore) / reset, with data counts.

## 7. Persistence, PWA & deployment

- `StoreProvider` (React context) wraps state + debounced localStorage writes.
- Export = `Blob` download of the store JSON; Import = read + `normalizeState` + replace.
- `vite-plugin-pwa` generates the manifest + service worker; app + fonts are precached
  → installable, offline. Icons generated by `scripts/gen-icons.mjs`.
- Vite `base: './'` (relative) so the build works under any GitHub Pages repo path.
- `.github/workflows/deploy.yml` runs tests + build and publishes `dist/` to Pages.

## 8. Architecture notes

- Scoring is **pure and decoupled** from React and from display strings (the UI formats
  results via `src/lib/result.ts`), which keeps it trivially testable and fast.
- Deleting a division/athlete/WOD cascades to remove dependent scores and competition
  membership, so the store never holds dangling references.
- **Times are picked, not typed.** A numeric keypad has no colon, so `m:ss` text entry
  was error-prone (`845` parsed as 14:05). Both time inputs — a WOD's cap and an
  athlete's finish time — use `TimeField` (`src/components/TimePicker.tsx`), two
  scroll-snap wheels in a `Sheet`. The selectable ranges come from pure helpers in
  `src/lib/timePicker.ts`, unit-tested like the scoring engine; passing `maxSeconds`
  truncates the wheels so an out-of-range time is unreachable rather than rejected.
  Scores stored before a cap was lowered still show a warning and open clamped at the cap.
- `Sheet` keeps a stack of open sheets so **Escape closes only the topmost** — the time
  picker opens over the WOD editor, and dismissing it must not discard the edit.
