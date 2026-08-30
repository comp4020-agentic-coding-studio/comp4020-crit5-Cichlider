// The live-physics replacement for last week's static `occludedBy` graph:
// instead of a pre-baked "this tile sits under that one" list, collectibility
// is derived each time from continuous body positions. Plain numbers in and
// out --- no three.js/cannon-es types --- so this is testable with hand-built
// fixtures exactly like the old static graph was.

export interface BodySnapshot {
  id: string;
  kind: string;
  x: number;
  y: number;
  z: number;
  footprintRadius: number;
  height: number;
}

export interface OcclusionParams {
  /** Fraction of (rA+rB) counted as "footprints overlap". */
  overlapMargin: number;
  /** How much higher another body's center must sit, over an overlapping
   * footprint, to count as resting on top of the target. */
  minRestingHeightDelta: number;
}

export const DEFAULT_OCCLUSION_PARAMS: OcclusionParams = {
  overlapMargin: 0.85,
  minRestingHeightDelta: 0.12,
};

function footprintsOverlap(a: BodySnapshot, b: BodySnapshot, params: OcclusionParams): boolean {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist < (a.footprintRadius + b.footprintRadius) * params.overlapMargin;
}

function restsAbove(above: BodySnapshot, below: BodySnapshot, params: OcclusionParams): boolean {
  return above.y - below.y > params.minRestingHeightDelta;
}

/** True iff no other body overlaps the target's footprint from meaningfully above it. */
export function isCollectible(
  bodies: BodySnapshot[],
  targetId: string,
  params: OcclusionParams = DEFAULT_OCCLUSION_PARAMS,
): boolean {
  const target = bodies.find((b) => b.id === targetId);
  if (!target) return false;
  return !bodies.some(
    (other) =>
      other.id !== targetId &&
      footprintsOverlap(target, other, params) &&
      restsAbove(other, target, params),
  );
}

/** 0 (fully exposed) .. 1 (deeply buried): how much sits on top, plus how far
 * from the container rim --- an item near the wall is easier to disturb by a
 * shake even under some weight, per the real game's documented behaviour. */
export function computeBurial(
  bodies: BodySnapshot[],
  targetId: string,
  containerRadius: number,
  params: OcclusionParams = DEFAULT_OCCLUSION_PARAMS,
): number {
  const target = bodies.find((b) => b.id === targetId);
  if (!target) return 1;

  let coverWeight = 0;
  for (const other of bodies) {
    if (other.id === targetId) continue;
    if (footprintsOverlap(target, other, params) && restsAbove(other, target, params)) {
      const heightDelta = other.y - target.y;
      coverWeight += Math.min(1, heightDelta / (target.height * 3));
    }
  }
  const coverTerm = Math.min(1, coverWeight);

  const distFromCenter = Math.sqrt(target.x * target.x + target.z * target.z);
  const edgeTerm = 1 - Math.min(1, distFromCenter / containerRadius);

  return Math.max(0, Math.min(1, coverTerm * 0.75 + edgeTerm * 0.25));
}
