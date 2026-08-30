# Process overview

## What I built

Goose Grab: a stacked-tile matching game. Eighteen tiles sit in six 3-deep
stacks; only the top, unoccluded tile of each stack is clickable, and clicking
sends it to a 7-slot rack where three of a kind clear automatically. Clear the
whole pot to win; overflow the rack or run out of the clock to lose.

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

## What's still yours to do

This build is a first, working pass --- deliberately handed back before the
crit rather than polished further, so it's your review, not mine. Play it,
decide whether the difficulty curve (six stacks, 90 seconds, a 7-slot rack)
actually feels fair at five minutes the way the brief asks, and adjust
`generateLevel`'s constants if not --- that's a feel judgment no test can make
for you. `reflections/crit-5.md` is also unwritten on purpose: the two
standing prompts ask what *you* found and what it changed about how *you* want
to work, and that's not something to fabricate on your behalf.
