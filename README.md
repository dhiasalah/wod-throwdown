# WOD Ranker

A phone-first, **offline**, **free** app to score CrossFit-style competitions and rank
athletes across multiple WODs — no app store, no server. It's a single static site you
install to your home screen and open like a native app.

- Manage **athletes** and **divisions**, build a **WOD** library, assemble a
  **competition**, enter **scores**, and get a live **leaderboard** per division.
- All data stays **on your phone** (localStorage). Export/Import a backup file any time.
- Built with **Vite + React + TypeScript + Tailwind**, installable via **PWA**.

---

## Quick start (local)

Requires Node 18+.

```bash
npm install
npm run dev      # open the printed http://localhost:5173 URL
npm test         # run the scoring unit tests
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Deploy to GitHub Pages (free hosting)

1. Push this repo to GitHub with the default branch named **`main`**.
2. In the repo, go to **Settings → Pages** and set **Source = GitHub Actions**.
3. Push to `main`. The included workflow (`.github/workflows/deploy.yml`) runs the tests,
   builds, and publishes `dist/`. When it finishes, your app is live at
   `https://<your-username>.github.io/<repo-name>/`.
4. Open that URL on your phone → **Share → Add to Home Screen**. It now runs offline.

> The build uses a **relative base** (`base: './'`), so it works under any repo name
> without configuration.

---

## Using the app

Bottom tabs: **Athletes · WODs · Comps · Backup**.

1. **Athletes** — tap **Divisions** to create divisions (e.g. *Men Rx*, *Women Scaled*),
   then add athletes into them. Athletes only ever compete against others in their division.
2. **WODs** — build a reusable library. Each WOD has a type:
   - **Reps / AMRAP** — most reps wins.
   - **For Time** — fastest wins; set a **time cap**. Athletes who don't finish are scored
     by reps completed at the cap and rank **below** everyone who finished.
   - **Max Load** — heaviest lift wins.
3. **Comps** — create a competition, open it, and in **Setup** tick which WODs and athletes
   are in it. Each WOD gets its own tab for **score entry** (the input adapts to the type).
4. **Leaderboard** tab — overall standings per division, plus a per-WOD breakdown with
   gold/silver/bronze badges. It updates live as you enter scores.
5. **Backup** — **Export** a `.json` file to keep your data safe or move it to another
   phone; **Import** to restore it.

For each athlete on a score-entry tab (these codes are also shown as a legend right above
the athlete list, so you don't need this page while judging):

- **FIN** / **SCORE** — finished before the cap; enter the result (reps, finish time, or kg).
- **CAP** (For Time only) — still working when the cap hit; enter reps completed.
- **DNF** — stopped early / no valid result.
- **ABS** — absent, didn't show.
- Tap the highlighted mode again to clear it.

**Times are picked, not typed.** Tapping a time field — a WOD's cap, or an athlete's finish
time — opens a picker with **minutes** and **seconds** wheels. On a For Time WOD the wheels
stop at the time cap: when the cap clock hits everyone stops, so a finish time above the cap
is impossible to enter.

---

## Ranking Rules (exactly how standings are computed)

Everything is computed **within a division**. Athletes are compared only against others in
the same division.

### 1. Each WOD is placed separately

For one WOD, athletes are sorted best → worst and each is given a **placement** (its
position: 1st, 2nd, 3rd…). The rules per type:

| WOD type        | Order (best first)                                                              |
| --------------- | ------------------------------------------------------------------------------ |
| **Reps / AMRAP**| Most reps first.                                                               |
| **Max Load**    | Heaviest kg first.                                                             |
| **For Time**    | **Finishers first**, fastest time first. Then **capped** athletes, most reps first. Finishers always rank above capped athletes. |

- **DNF, Absent, or no score entered** → sorted to the **bottom**. A missing score in a
  scored WOD counts as **last place**.
- **Ties** (identical result) **share the average of the positions they occupy.** Example:
  two athletes tied for 2nd/3rd each get **2.5** placement points.

### 2. Overall = sum of placements, lowest wins

Add up each athlete's placement points across all WODs in the competition. **The lowest
total wins** (golf scoring — 1st place is worth the fewest points).

### 3. Ties broken by countback (best placings)

If two athletes have the same total, compare their placement lists: whoever has the
**better single placing** wins (a 1st beats a 2nd; if equal, compare next-best, and so on).
If the lists are identical, they genuinely **share** the rank.

---

## Worked example

One division, **4 athletes** (A, B, C, D), **3 WODs**. *(This is verified by the
"README worked example" test in `src/scoring.test.ts`.)*

**WOD 1 — Cindy (Reps / AMRAP)**

| Athlete | Reps | Placement |
| ------- | ---- | --------- |
| B       | 300  | **1**     |
| A       | 250  | **2.5** (tie) |
| C       | 250  | **2.5** (tie) |
| D       | 180  | **4**     |

*(A and C tie for 2nd/3rd → they share (2+3)/2 = 2.5.)*

**WOD 2 — Grace (For Time, cap 5:00)**

| Athlete | Result           | Placement |
| ------- | ---------------- | --------- |
| A       | 3:20 (finished)  | **1.5** (tie) |
| D       | 3:20 (finished)  | **1.5** (tie) |
| B       | 4:00 (finished)  | **3**     |
| C       | 22 reps (capped) | **4**     |

*(A and D tie for 1st/2nd → 1.5 each. C didn't finish, so ranks below all finishers.)*

**WOD 3 — Max Deadlift (Max Load)**

| Athlete | Load   | Placement |
| ------- | ------ | --------- |
| B       | 200 kg | **1**     |
| A       | 180 kg | **2**     |
| C       | 170 kg | **3**     |
| D       | Absent | **4** (last) |

**Overall standings** (sum placements, lowest wins):

| Rank | Athlete | Cindy | Grace | Deadlift | **Total** | Notes |
| ---- | ------- | ----- | ----- | -------- | --------- | ----- |
| 🥇 1 | **B**   | 1     | 3     | 1        | **5.0**   |       |
| 🥈 2 | **A**   | 2.5   | 1.5   | 2        | **6.0**   |       |
| 🥉 3 | **D**   | 4     | 1.5   | 4        | **9.5**   | wins countback |
| 4    | **C**   | 2.5   | 4     | 3        | **9.5**   |       |

C and D both total **9.5**. Countback compares their sorted placements —
D = [1.5, 4, 4] vs C = [2.5, 3, 4]. D's best placing (1.5) beats C's best (2.5),
so **D takes 3rd**.

---

## Project layout

```
src/
  types.ts        data model + storage key
  store.tsx       React context, localStorage persistence, CRUD + backup
  scoring.ts      pure ranking engine  (rankWod, overallStandings)
  scoring.test.ts unit tests (rules, ties, countback, worked example)
  lib/            id, time formatting, result formatting
  components/     UI kit (Card, RankBadge, TabBar, Modal, ScoreEntry, Leaderboard)
  screens/        Athletes, WODs, Competitions, CompetitionDetail, Settings
scripts/gen-icons.mjs   generates the PWA PNG icons
design.md               living design document
```

See **`design.md`** for the full design, palette, and architecture notes.
