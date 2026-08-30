// Pure game rules for the goose-grab matching game --- no DOM, no timers, so
// every rule here is unit-testable without jsdom. main.ts is the only file
// that touches the document or a real clock.

export interface TileDef {
  id: string;
  kind: string;
  /** ids of tiles that must be gone from the board before this one is clickable */
  occludedBy: string[];
}

export interface Level {
  tiles: TileDef[];
  rackCapacity: number;
  timeLimitSeconds: number;
}

export type Status = "playing" | "won" | "lost";

export interface GameState {
  level: Level;
  board: Set<string>;
  rack: string[]; // kinds, in collection order
  status: Status;
  timeRemaining: number;
}

export function createGame(level: Level): GameState {
  return {
    level,
    board: new Set(level.tiles.map((t) => t.id)),
    rack: [],
    status: "playing",
    timeRemaining: level.timeLimitSeconds,
  };
}

export function isVisible(state: GameState, tileId: string): boolean {
  if (!state.board.has(tileId)) return false;
  const tile = state.level.tiles.find((t) => t.id === tileId);
  if (!tile) return false;
  return tile.occludedBy.every((occluderId) => !state.board.has(occluderId));
}

/** Collect a tile if the rules allow it; otherwise returns the state unchanged. */
export function collect(state: GameState, tileId: string): GameState {
  if (state.status !== "playing") return state;
  if (!isVisible(state, tileId)) return state;

  const tile = state.level.tiles.find((t) => t.id === tileId)!;
  const board = new Set(state.board);
  board.delete(tileId);
  const rack = [...state.rack, tile.kind];

  const matched = rack.filter((k) => k === tile.kind).length >= 3;
  if (matched) {
    let removed = 0;
    for (let i = rack.length - 1; i >= 0 && removed < 3; i--) {
      if (rack[i] === tile.kind) {
        rack.splice(i, 1);
        removed++;
      }
    }
  }

  let status: Status = state.status;
  if (board.size === 0 && rack.length === 0) {
    status = "won";
  } else if (rack.length > state.level.rackCapacity) {
    status = "lost";
  }

  return { ...state, board, rack, status };
}

/** Advance the clock by dt seconds. Losing on timeout is a rule, not a render detail. */
export function tick(state: GameState, dt: number): GameState {
  if (state.status !== "playing") return state;
  const timeRemaining = Math.max(0, state.timeRemaining - dt);
  const status: Status = timeRemaining === 0 ? "lost" : state.status;
  return { ...state, timeRemaining, status };
}

const KINDS = ["goose", "egg", "corn", "bread", "feather", "wheat"] as const;

/** Six 3-deep stacks, kinds shuffled across the 18 slots so a triple is
 * usually scattered across more than one stack --- that's the puzzle. */
export function generateLevel(rng: () => number = Math.random): Level {
  const kinds = KINDS.flatMap((k) => [k, k, k]);
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }

  const stacks = 6;
  const depth = 3;
  const tiles: TileDef[] = [];
  let k = 0;
  for (let s = 0; s < stacks; s++) {
    const stackIds: string[] = [];
    for (let d = 0; d < depth; d++) {
      const id = `s${s}-d${d}`;
      stackIds.push(id);
      tiles.push({ id, kind: kinds[k++], occludedBy: [] });
    }
    // within a stack, each layer is occluded by every layer above it
    for (let d = 0; d < depth; d++) {
      const tile = tiles.find((t) => t.id === stackIds[d])!;
      tile.occludedBy = stackIds.slice(d + 1);
    }
  }

  return { tiles, rackCapacity: 7, timeLimitSeconds: 90 };
}
