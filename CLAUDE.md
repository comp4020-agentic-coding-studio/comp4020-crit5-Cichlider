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

Goose Grab went through one full architectural pivot mid-week: a flat
CSS-grid of six fixed 3-deep stacks was rejected as not really 抓大鹅 at all
(no real container, no emergent occlusion, unwinnable-by-construction level
counts) and rebuilt as an actual physics-simulated pile of independent 3D
meshes (three.js render, cannon-es physics) settling under real gravity in a
single container. The notes below describe the current, physics-based build.

- **Pure/testable core vs. visual-only glue is now a much bigger split than
  last week's.** Pure and unit-tested, no DOM/WebGL/jsdom required:
  `item-kinds.ts` (the kind catalog), `levels.ts` (level generation),
  `occlusion.ts` (collectibility + burial math over plain `BodySnapshot[]`),
  `shake.ts` (the impulse-falloff math), `game.ts` (rules over `GameState`),
  and --- notably --- `physics-world.ts`: cannon-es needs no WebGL/DOM, so its
  actual settle/locality behavior gets a headless regression test
  (`spec/physics-world.test.ts`), not just a note that physics can't be
  tested. Visual-only, judged by eye against `pnpm dev`: `scene.ts` (camera,
  lighting, raycasting, the render/physics loop), `mesh-library.ts` (what the
  procedural meshes actually look like), `tray.ts` (the fly-to-slot DOM
  animation), and the devicemotion/drag shake adapters --- same "some things
  can only be checked by looking" limit as last week's `AudioContext`, now
  covering a much larger surface (an entire 3D scene) instead of one API.
- **Procedural meshes are a deliberate scope decision, not a shortcut.**
  `mesh-library.ts` builds every item from combined primitive three.js
  geometries (boxes/spheres/cylinders/capsules/icosahedra) --- there is no
  asset pipeline in a one-week prototype, and that's fine.
- **`levels.ts` guarantees every kind's count is a multiple of 3 by
  construction, not by validation.** Level 2's per-kind count is computed
  directly as `3 * randomInt(2, 5)` at generation time; there is no
  after-the-fact check that could fail and no path that produces an
  unwinnable count. (The old `generateLevel` used to compute a count and
  then rely on a comment reminding you it should be a multiple of 3 --- that
  was the actual bug the user's critique caught.)
- **A follow-up critique ("建模过于粗糙", "容器内容太少、太浅") caught that a
  guaranteed-multiple-of-3 count is not the same as a guaranteed-*dense*
  one.** The old range (`kindCount` 10-15, per-kind `3*randomInt(1,8)`)
  allowed a worst case of only 30 items --- barely a monolayer, glanceable
  at a glimpse with no real digging. `generateLevel2` now guarantees a
  **floor** of 84 items (14-18 kinds, `3*randomInt(2,5)` = 6-15 each) in a
  smaller-radius, much taller container, so items stack in real layers
  instead of spreading wide. This is a worst-case guarantee, not just a
  denser average: `spec/levels.test.ts` asserts the *minimum* bound, not
  just a sampled result. Container height is a physics safety margin, not
  a visual constant --- `scene.ts` derives camera framing from a separately
  capped `framingHeight`, not the raw value, or the shot zooms out to match
  whatever margin containment needs.
- **cannon-es has no continuous collision detection.** A fast-moving item
  (e.g. flung by a vigorous shake) can tunnel straight through a thin
  static collider in a single physics step. This bit the Level 2 container
  wall (originally 0.05 units thick) and combined badly with an infinite
  floor plane: anything that escaped the open-topped wall just came to
  rest outside the pot on the infinite floor, in plain view and clearly
  broken. Fixed by thickening the wall segments (0.25) and bounding the
  floor to a finite box sized to the container, so a residual escapee falls
  through instead of resting visibly beside it.
- **`collect()` in `game.ts` no longer gates on occlusion itself** --- it
  trusts its caller (`scene.ts`) to have already checked
  `occlusion.isCollectible()` against live physics-body positions before
  calling it. This moved because occlusion is now a property of where bodies
  actually are after real physics settling, not a static graph `game.ts` can
  own.
- **The "颠锅" shake mechanic is structurally incapable of being a shuffle.**
  `computeShakeImpulse(burial, shakeVector, baseMagnitude)` in `shake.ts`
  takes no target-item id --- there is no code path from "which item do I
  want" to "give that item extra force." Impulse scales per-body by
  `burialToImpulseScale(burial)`, a steep `(1 - burial)^2` falloff, so buried
  items barely move regardless of how hard or long you shake. Vigorous
  shaking can visibly re-cluster the pile and reduce exposed area --- a real
  physics consequence of the impulse, not a scripted risk/reward rule.
- **"Local settling only" (never a full-pile collapse on collect) is a
  physics-tuning outcome, not special-cased code.** `physics-world.ts` removes
  a collected body and lets gravity/contacts handle whatever was resting on
  it --- no "nudge neighbors" or "collapse everything" logic exists anywhere.
  The behavior comes from tuned constants (moderate-high friction ~0.6, low
  restitution ~0.08, linear/angular damping 0.4/0.6, 14 solver iterations,
  body sleeping enabled) verified by `spec/physics-world.test.ts`: removing a
  load-bearing body noticeably moves its direct neighbor while a distant,
  unrelated body barely moves at all.
- Keep game rules in `game.ts` as pure functions over a `GameState` (no DOM, no
  `setInterval`) --- `scene.ts` is the only file that touches `document`, a
  real clock, or WebGL. `tick(state, dt)` still takes elapsed time as a plain
  argument instead of reading a real clock, so the timeout-loses-the-game rule
  keeps an actual test (`spec/game.test.ts`).
- `three@0.185.x` does **not** ship its own TypeScript types (verified via
  `npm view three@0.185.1 types` returning empty, and no `.d.ts` files in the
  installed package) --- `@types/three` is a real, needed devDependency here,
  not dead weight to prune.
