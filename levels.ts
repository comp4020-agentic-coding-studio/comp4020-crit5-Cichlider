// Produces spawn data only --- no baked occlusion graph, no engine types.
// physics-world.ts turns each ItemSpawn into a body+mesh; where it lands and
// what ends up resting on what is left entirely to the physics step.

import { ITEM_KINDS, findItemKind } from "./item-kinds";

export interface ItemSpawn {
  id: string;
  kind: string;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export interface Level {
  name: string;
  containerRadius: number;
  containerHeight: number;
  spawns: ItemSpawn[];
}

export type Rng = () => number;

function randomInt(rng: Rng, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));
}

function shuffledCopy<T>(arr: T[], rng: Rng): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface SpawnParams {
  containerRadius: number;
  containerHeight: number;
  xzSpread: number;
  dropHeightMin: number;
  dropHeightMax: number;
  dropHeightStep: number;
}

function buildLevel(name: string, kindCounts: Map<string, number>, rng: Rng, params: SpawnParams): Level {
  const spawns: ItemSpawn[] = [];
  let n = 0;
  let dropHeight = params.dropHeightMin;
  for (const [kind, count] of kindCounts) {
    findItemKind(kind); // throws on an unknown kind before any spawn is built
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const radius = rng() * params.xzSpread;
      spawns.push({
        id: `${kind}-${n}`,
        kind,
        x: Math.cos(angle) * radius,
        y: dropHeight,
        z: Math.sin(angle) * radius,
        rotX: rng() * Math.PI * 2,
        rotY: rng() * Math.PI * 2,
        rotZ: rng() * Math.PI * 2,
      });
      n++;
      dropHeight += params.dropHeightStep;
      if (dropHeight > params.dropHeightMax) dropHeight = params.dropHeightMin;
    }
  }
  return { name, containerRadius: params.containerRadius, containerHeight: params.containerHeight, spawns };
}

/** Tutorial level: exactly the real game's own minimal set (cabbage /
 * space-pepper / ginger), 3 each, wide spread and a shallow drop so almost
 * everything is visible with only minor overlap. */
export function generateLevel1(rng: Rng): Level {
  const kindCounts = new Map([
    ["cabbage", 3],
    ["space-pepper", 3],
    ["ginger", 3],
  ]);
  return buildLevel("Level 1", kindCounts, rng, {
    containerRadius: 1.4,
    containerHeight: 1.4,
    xzSpread: 1.0,
    dropHeightMin: 0.6,
    dropHeightMax: 0.9,
    dropHeightStep: 0.1,
  });
}

/** The real game: 14-18 kinds out of the full catalog, each kind's count a
 * strict multiple of 3 by construction (never validated after the fact) and
 * drawn from `3 * randomInt(2, 5)` (6-15 per kind) so the *worst case* is
 * guaranteed dense --- at least 14*6 = 84 items, several layers deep at this
 * container's floor area, not just a high average that an unlucky roll can
 * miss. Tight spread and a tall drop over a small, deep container so items
 * pile in real layers instead of spreading into a single flat sheet. Total
 * item count is still an emergent result of the per-kind randomization, not
 * a fixed constant --- there is no "official 300", so none is hardcoded
 * here. */
export function generateLevel2(rng: Rng): Level {
  const kindPool = shuffledCopy(ITEM_KINDS, rng);
  const kindCount = randomInt(rng, 14, Math.min(18, kindPool.length));
  const chosenKinds = kindPool.slice(0, kindCount);

  const kindCounts = new Map<string, number>();
  for (const def of chosenKinds) {
    kindCounts.set(def.kind, 3 * randomInt(rng, 2, 5));
  }

  return buildLevel("Level 2", kindCounts, rng, {
    containerRadius: 1.05,
    containerHeight: 5.8,
    xzSpread: 0.65,
    dropHeightMin: 0.6,
    dropHeightMax: 3.0,
    dropHeightStep: 0.05,
  });
}
