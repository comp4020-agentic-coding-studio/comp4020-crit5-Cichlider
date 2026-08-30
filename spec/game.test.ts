import { describe, expect, it } from "vitest";
import { collect, createGame, tick, type GameConfig } from "../game";
import type { ItemSpawn } from "../levels";

// Hand-built fixtures, not generateLevel1/2 --- the rules should hold for
// any set of items, and a fixed fixture keeps these tests deterministic.
// Occlusion no longer lives in this module (see occlusion.test.ts), so
// these fixtures are just flat item lists.
function spawn(id: string, kind: string): ItemSpawn {
  return { id, kind, x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 };
}

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return { rackCapacity: 3, timeLimitSeconds: 60, ...overrides };
}

describe("collecting", () => {
  it("moves an item from remaining to the rack", () => {
    const state = createGame([spawn("a", "goose")], config());
    const after = collect(state, "a");
    expect(after.remaining.has("a")).toBe(false);
    expect(after.rack).toEqual(["goose"]);
  });

  it("does nothing for an id that isn't in play", () => {
    const state = createGame([spawn("a", "goose")], config());
    const after = collect(state, "missing");
    expect(after.rack).toEqual([]);
    expect(after.remaining.size).toBe(1);
  });

  it("clears three of a kind from the rack automatically", () => {
    let state = createGame([spawn("a1", "goose"), spawn("a2", "goose"), spawn("a3", "goose")], config());
    state = collect(state, "a1");
    state = collect(state, "a2");
    state = collect(state, "a3");
    expect(state.rack.filter((k) => k === "goose")).toHaveLength(0);
  });
});

describe("win and loss", () => {
  it("wins when remaining items and the rack both empty out", () => {
    // Every kind must total a multiple of 3, or the rack can never empty ---
    // levels.ts's generateLevel2 guarantees that by construction; this
    // fixture does it by hand.
    let state = createGame(
      [spawn("x1", "goose"), spawn("x2", "goose"), spawn("x3", "goose")],
      config(),
    );
    state = collect(state, "x1");
    state = collect(state, "x2");
    state = collect(state, "x3");
    expect(state.status).toBe("won");
  });

  it("loses when the rack would overflow capacity", () => {
    let state = createGame(
      [spawn("x", "egg"), spawn("y", "corn"), spawn("z", "wheat-sheaf")],
      config({ rackCapacity: 2 }),
    );
    state = collect(state, "x");
    state = collect(state, "y");
    state = collect(state, "z");
    expect(state.status).toBe("lost");
  });

  it("loses when time runs out before the items clear", () => {
    let state = createGame([spawn("a", "goose")], config());
    state = tick(state, 60);
    expect(state.status).toBe("lost");
  });

  it("freezes once the game is over: no more collecting, no more ticking", () => {
    let state = createGame([spawn("a", "goose")], config());
    state = tick(state, 60);
    const beforeRack = state.rack.length;
    state = collect(state, "a");
    state = tick(state, 5);
    expect(state.rack).toHaveLength(beforeRack);
    expect(state.timeRemaining).toBe(0);
  });
});
