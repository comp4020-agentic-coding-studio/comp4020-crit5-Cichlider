# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so the deployed head is the only place a broken one shows up.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.

## Crit 5 notes

- Keep game rules in `game.ts` as pure functions over a `GameState` (no DOM, no
  `setInterval`) --- `main.ts` is the only file that touches `document` or a
  real clock. Last week's `AudioContext` couldn't be exercised in jsdom at
  all; this week's `tick(state, dt)` takes elapsed time as a plain argument
  instead of reading a real clock, so the timeout-loses-the-game rule gets an
  actual test (`spec/game.test.ts`), not just a note that it's unverifiable.
- `generateLevel` requires every tile kind's total count to be a multiple of
  3, or a leftover one or two can never clear and the board can go empty
  while the rack doesn't --- `win` checks both `board.size === 0` and
  `rack.length === 0` for exactly that reason. A test fixture that breaks
  this invariant fails the win check, not the game.
