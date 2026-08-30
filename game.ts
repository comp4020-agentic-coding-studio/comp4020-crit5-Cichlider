// Pure game rules --- no DOM, no timers, no three.js/cannon-es types, so
// every rule here is unit-testable without jsdom or WebGL. scene.ts is the
// only place that touches the document, a render loop, or physics bodies.
//
// Occlusion is no longer a rule this module enforces: it used to gate
// `collect` itself, but now that "on top of" is a live geometric fact about
// moving 3D bodies (occlusion.ts's isCollectible), that check has to happen
// where the bodies live. collect() trusts its caller (scene.ts) to have
// already confirmed the clicked item is collectible before calling it.

import type { ItemSpawn } from "./levels";

export interface GameConfig {
  rackCapacity: number;
  timeLimitSeconds: number;
}

export type Status = "playing" | "won" | "lost";

export interface GameState {
  config: GameConfig;
  /** items still in the scene, id -> kind */
  remaining: Map<string, string>;
  /** kinds, in collection order */
  rack: string[];
  status: Status;
  timeRemaining: number;
}

export function createGame(spawns: ItemSpawn[], config: GameConfig): GameState {
  return {
    config,
    remaining: new Map(spawns.map((s) => [s.id, s.kind])),
    rack: [],
    status: "playing",
    timeRemaining: config.timeLimitSeconds,
  };
}

/** Collect an item by id. Assumes the caller already checked it's
 * collectible (not buried under another body) --- returns the state
 * unchanged if the id isn't in play or the game is already over. */
export function collect(state: GameState, id: string): GameState {
  if (state.status !== "playing") return state;
  const kind = state.remaining.get(id);
  if (kind === undefined) return state;

  const remaining = new Map(state.remaining);
  remaining.delete(id);
  const rack = [...state.rack, kind];

  const matched = rack.filter((k) => k === kind).length >= 3;
  if (matched) {
    let removed = 0;
    for (let i = rack.length - 1; i >= 0 && removed < 3; i--) {
      if (rack[i] === kind) {
        rack.splice(i, 1);
        removed++;
      }
    }
  }

  let status: Status = state.status;
  if (remaining.size === 0 && rack.length === 0) {
    status = "won";
  } else if (rack.length > state.config.rackCapacity) {
    status = "lost";
  }

  return { ...state, remaining, rack, status };
}

/** Advance the clock by dt seconds. Losing on timeout is a rule, not a
 * render detail, so it gets its own test independent of a real clock. */
export function tick(state: GameState, dt: number): GameState {
  if (state.status !== "playing") return state;
  const timeRemaining = Math.max(0, state.timeRemaining - dt);
  const status: Status = timeRemaining === 0 ? "lost" : state.status;
  return { ...state, timeRemaining, status };
}
