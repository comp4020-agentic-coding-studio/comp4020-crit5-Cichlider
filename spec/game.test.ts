import { describe, expect, it } from "vitest";
import { collect, createGame, isVisible, tick, type Level } from "../game";

// A small hand-built fixture, not `generateLevel` --- the rules should hold
// for any layout, and a fixed fixture keeps these tests deterministic.
function fixture(): Level {
  return {
    rackCapacity: 3,
    timeLimitSeconds: 60,
    tiles: [
      { id: "bottom", kind: "goose", occludedBy: ["top"] },
      { id: "top", kind: "egg", occludedBy: [] },
      { id: "a2", kind: "goose", occludedBy: [] },
      { id: "a3", kind: "goose", occludedBy: [] },
    ],
  };
}

describe("occlusion", () => {
  it("hides a tile stacked under another still on the board", () => {
    const state = createGame(fixture());
    expect(isVisible(state, "bottom")).toBe(false);
  });

  it("reveals it once the occluder is gone", () => {
    let state = createGame(fixture());
    state = collect(state, "top");
    expect(isVisible(state, "bottom")).toBe(true);
  });

  it("refuses to collect an occluded tile", () => {
    const state = createGame(fixture());
    const after = collect(state, "bottom");
    expect(after.board.has("bottom")).toBe(true);
    expect(after.rack).toEqual([]);
  });
});

describe("collecting", () => {
  it("moves a visible tile from the board to the rack", () => {
    const state = createGame(fixture());
    const after = collect(state, "a2");
    expect(after.board.has("a2")).toBe(false);
    expect(after.rack).toEqual(["goose"]);
  });

  it("clears three of a kind from the rack automatically", () => {
    let state = createGame(fixture());
    state = collect(state, "top"); // reveals "bottom"
    state = collect(state, "a2");
    state = collect(state, "a3");
    state = collect(state, "bottom");
    expect(state.rack.filter((k) => k === "goose")).toHaveLength(0);
  });
});

describe("win and loss", () => {
  it("wins when the board and rack both empty out", () => {
    // Every kind must total a multiple of 3, or the rack can never empty ---
    // `generateLevel` guarantees that; this fixture does it by hand.
    const level: Level = {
      rackCapacity: 3,
      timeLimitSeconds: 60,
      tiles: [
        { id: "x1", kind: "goose", occludedBy: [] },
        { id: "x2", kind: "goose", occludedBy: [] },
        { id: "x3", kind: "goose", occludedBy: [] },
      ],
    };
    let state = createGame(level);
    state = collect(state, "x1");
    state = collect(state, "x2");
    state = collect(state, "x3");
    expect(state.status).toBe("won");
  });

  it("loses when the rack would overflow capacity", () => {
    const level: Level = {
      rackCapacity: 2,
      timeLimitSeconds: 60,
      tiles: [
        { id: "x", kind: "egg", occludedBy: [] },
        { id: "y", kind: "corn", occludedBy: [] },
        { id: "z", kind: "wheat", occludedBy: [] },
      ],
    };
    let state = createGame(level);
    state = collect(state, "x");
    state = collect(state, "y");
    state = collect(state, "z");
    expect(state.status).toBe("lost");
  });

  it("loses when time runs out before the board clears", () => {
    let state = createGame(fixture());
    state = tick(state, 60);
    expect(state.status).toBe("lost");
  });

  it("freezes once the game is over: no more collecting, no more ticking", () => {
    let state = createGame(fixture());
    state = tick(state, 60);
    const beforeRack = state.rack.length;
    state = collect(state, "top");
    state = tick(state, 5);
    expect(state.rack).toHaveLength(beforeRack);
    expect(state.timeRemaining).toBe(0);
  });
});
