# CS2 Tracker

A single-page site for tracking CS2 tournaments, matches, and your own bets — with a
running win/loss counter checked against the actual match winners.

## Run it

No build step or server required.

```
open index.html
```

or serve it locally:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000/cs2-tracker/`.

## What it does

- **Tournaments** — add events (name, organizer, dates, prize pool).
- **Matches** — add matches under a tournament, then record the actual result
  (winner + score) once it's played.
- **Bets** — log a bet against any upcoming/live match (pick, stake, decimal odds).
  When a match result is set, matching bets auto-resolve to Won/Lost.
- **Dashboard** — a Win/Loss counter, win rate, total staked, net profit/loss, and ROI.
- **Winners** — a results log of completed matches with the actual winner and how
  your bet on it turned out.

## Data

Everything is stored in the browser's `localStorage` (per browser, per device) — there's
no backend. Use the **⋮** menu in the top-right to export/import your data as JSON,
reload the bundled sample data, or erase everything and start clean.
