# Process overview

## What I built

Goose Grab: a real physics-simulated pile of independent 3D items (three.js
render, cannon-es physics) settling under gravity inside a single container.
Click a topmost, unoccluded item and it flies into a 7-slot rack, where three
of a kind auto-clear. A continuous "颠锅" (pot-shake) input --- device
accelerometer on mobile, drag on desktop --- nudges the pile every frame,
scaled steeply by how buried each item is, so shaking can expose things but
can never target-unbury a specific one. Level 1 is a 9-item, 3-kind tutorial
pile; level 2 is a dense 10-15-kind pile with every kind's count a multiple of
3 by construction. Clear the pile to win; overflow the rack or run out of the
clock to lose.

## The pivot: from flat stacks to a real physics pile

The first working version (described further down, kept for the record) was a
CSS grid of six fixed 3-deep stacks of emoji buttons --- reviewed and rejected
as not actually 抓大鹅: no real container, no emergent occlusion or collision,
and a level generator whose per-kind counts weren't even guaranteed multiples
of 3 (unwinnable by construction, not just by bad luck). The rebuild below
replaced essentially the entire game core over three commits:

1. **[`4d42e2e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Cichlider/commit/4d42e2e)
   --- added three.js (render) and cannon-es (physics)**, choosing cannon-es
   over `@dimforge/rapier3d-compat` specifically because it's synchronous ---
   no `await RAPIER.init()` lifecycle to thread through `main.ts` or every
   test --- and needs no WASM bundling in Vite. This surfaced a factual error
   in my own plan: I'd assumed three.js ships its own TS types now and told
   myself not to add `@types/three`; `pnpm typecheck` proved that wrong
   (`TS7016` on every three.js import), and `npm view three@0.185.1 types`
   confirmed the package genuinely ships none. Trusting the compiler over my
   own prior assumption caught this before it became a stale comment.
2. **[`754a663`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Cichlider/commit/754a663)
   --- rebuilt the pure, testable core**: `item-kinds.ts`, `levels.ts`,
   `occlusion.ts`, `shake.ts`, and `physics-world.ts`, plus a rewritten
   `game.ts`. The load-bearing decision here is in `shake.ts`:
   `computeShakeImpulse` takes no target-item id at all, which makes "shake"
   structurally incapable of becoming "shuffle" --- there's no argument you
   could pass it to unbury a chosen item. `physics-world.ts` also proved out
   something I wasn't sure would work: cannon-es needs no WebGL or DOM, so
   `spec/physics-world.test.ts` runs real gravity and contact resolution
   headlessly and asserts the actual "local settling, not a full collapse"
   requirement --- removing a load-bearing body moves its direct neighbor but
   leaves a distant, unrelated body almost untouched.
3. **[`eb6c0e6`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Cichlider/commit/eb6c0e6)
   --- wired it all up to a real `<canvas>`**: `scene.ts` (camera/lighting/
   raycasting/render loop), `mesh-library.ts` (procedural primitive meshes,
   deliberately no asset pipeline), and `tray.ts` (the fly-to-slot animation,
   which only commits the collection on animation-arrival, not on click).

## Bugs a headless Chromium pass caught that no test could

None of the above is checkable by a unit test --- a camera angle, a wall
mesh's height, or whether a banner is visible to a human for even one frame
are facts about pixels and timing, not about pure functions. A headless
Chromium pass against `pnpm dev` (screenshot, click, screenshot again) caught
two real bugs after `eb6c0e6`:

- **The container wall was hiding most of the pile.** The rendered wall mesh
  was as tall as the *physics* wall (2 units), which from the camera's
  starting angle occluded most of the floor behind the near rim --- a
  sweep-click test came back with zero collectible clicks landing. Fixed by
  decoupling the visual wall height (0.7) from the physics wall height (still
  2, for real containment) and steepening the camera. A follow-up screenshot
  showed all 9 level-1 items visible with only minor overlap, matching the
  tutorial-level spec exactly.
- **The win banner was set and hidden again in the same tick.** `onWin` called
  `startLevel2` synchronously, which disposed the current scene (banner and
  all) before a single frame could render it. Fixed with an 1800ms
  `setTimeout` before the level-2 transition. A grid-sweep click test then
  confirmed the full path end-to-end: level 1 clears, the banner reads "抓到
  大鹅了 --- 你赢了。", and level 2 loads as a genuinely dense, heavily
  occluded 25-30 item pile once physics settles.

A vigorous drag-shake test also produced a dramatic, temporary re-clustering
of the level-2 pile mid-shake before it resettled --- exactly the "risk, not
purely a benefit" behavior the shake mechanic is supposed to have, not a bug.

## Round two: mesh fidelity and a genuinely deep pile

The user played the deployed build and called out two problems directly: the
items read as bare primitives, not real food, and the container held too
little at too shallow a depth to need real digging. Both were fixed in two
commits, verified again with a headless Chromium pass rather than just green
tests:

1. **[`0346a74`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Cichlider/commit/0346a74)
   --- reworked every item mesh to compose 3-5 primitives/techniques instead
   of 1-2** (lathe bulbs, lumpy vertex displacement, extruded leaf
   silhouettes), and added five new kinds (onion, pumpkin, eggplant, peanut,
   scallion) to widen Level 2's variety pool to 20.
2. **[`5d3e989`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Cichlider/commit/5d3e989)
   --- raised Level 2's *guaranteed floor* from 30 items to 84** by
   tightening the per-kind and kind-count RNG ranges, not just its average,
   and shrank the container radius so the extra items stack in real layers.
   This surfaced two genuine physics bugs invisible to any unit test: a
   taller pile let items clear the open-topped wall (or tunnel through a
   too-thin wall segment in one step --- cannon-es has no CCD) and land on
   what was an infinite floor plane, resting in open air outside the pot.
   Fixed by thickening the wall segments and bounding the floor to a finite
   box. Fixing *that* introduced a camera regression --- the taller
   container (a physics safety margin) fed directly into camera distance,
   zooming out far past what the actual pile needed --- fixed by capping a
   separate `framingHeight` used only for camera/visual-wall math.

   Verification here was iterative and screenshot-driven, not one pass: a
   temporary `window.__gooseDebug` hook (removed before this commit) gave
   ground truth on remaining-item counts and game status so a headless
   Playwright script could confirm, round by round, that Level 1 still
   clears, Level 2 settles with no items outside the container, the pile
   reads as dense/multi-layer/occluded, and a spread of clicks across the
   pot still collects buried items --- rather than trusting a single
   screenshot or a passing test suite alone.

## What's still yours to do

Actual device-motion "shake with a phone" and iOS's `DeviceMotionEvent`
permission-tap flow cannot be verified headlessly --- that's a manual, on-device
check, same as any other DOM-input adapter in this repo. Play it and decide
whether level 2's density and the shake's force constants feel right at your
own five minutes; those are `levels.ts`/`shake.ts` constants, not architecture,
and adjusting them is a feel judgment no test can make for you.
`reflections/crit-5.md` is still unwritten on purpose, for the same reason it
was last time.

## The original flat-grid build (superseded, kept for the record)

## The moments that mattered

1. **Scope: cut the shake and revive mechanics before writing any code.**
   TankTrouble (a finished, unrelated third-party game) was rejected as the
   week's submission earlier in this session --- deploying someone else's
   built work isn't process, it's the opposite of what a crit judges. Goose
   Grab was picked instead as an original build in a well-known casual genre
   (the same territory as a 2048 or Flappy Bird clone), then explicitly
   trimmed to its core loop: no shuffle/shake, no revive item, so the one
   mechanic --- click the visible tile, match three, clear the pot --- stays
   the whole game rather than competing with extras.
2. **Kept game rules out of the DOM entirely, on purpose.** `game.ts` has no
   `document` and no `setInterval` --- `collect`, `isVisible` and `tick` are
   plain functions over a `GameState` value. That's what let every hard rule
   in the spec (occlusion gates a click, three-of-a-kind clears, the rack can
   overflow, the clock can run out) get its own test in `spec/game.test.ts`,
   added alongside `game.ts` in
   [`2fcda04`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Cichlider/commit/2fcda04),
   rather than being asserted only by eye. Last week's instrument couldn't
   test its `AudioContext` scheduler at all in jsdom; this week's `tick(state,
   dt)` sidesteps the same problem by taking elapsed time as an argument
   instead of reading a real clock.
3. **A fixture bug the tests caught, not the eye.** The first version of the
   "wins when the board and rack both empty out" test used a fixture with a
   tile kind that only appeared once, so it could never clear from the rack
   --- the test failed with `status: "playing"` instead of `"won"`, which is
   what surfaced the real constraint (every kind's count must be a multiple
   of 3) that `generateLevel` depends on and that `CLAUDE.md` now records.
   Caught before it ever reached a real playthrough.
4. **Looked at the rendered page, not just green tests.** After
   [`1f8221d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Cichlider/commit/1f8221d)
   wired `main.ts` up to the DOM, a headless Chromium pass against `pnpm dev`
   (screenshots + `console --errors`) confirmed the layering reads correctly
   --- covered tiles visibly dimmed and inert,
   the top tile bright, the rack filling as tiles are collected --- and
   caught nothing wrong, but that's the check the unit tests structurally
   can't do: they can't see whether the stack *looks* like a stack.
