import { describe, expect, it } from "vitest";
import { computeBurial, isCollectible, type BodySnapshot } from "../occlusion";

function body(overrides: Partial<BodySnapshot> & { id: string }): BodySnapshot {
  return {
    kind: "corn",
    x: 0,
    y: 0,
    z: 0,
    footprintRadius: 0.2,
    height: 0.3,
    ...overrides,
  };
}

describe("isCollectible", () => {
  it("is collectible when nothing overlaps it", () => {
    const bodies = [body({ id: "a", x: 0, y: 0 }), body({ id: "b", x: 5, y: 0 })];
    expect(isCollectible(bodies, "a")).toBe(true);
  });

  it("is blocked by an overlapping body resting above it", () => {
    const bodies = [body({ id: "a", x: 0, y: 0 }), body({ id: "b", x: 0.05, y: 0.3 })];
    expect(isCollectible(bodies, "a")).toBe(false);
  });

  it("is not blocked by an overlapping body at roughly the same height", () => {
    const bodies = [body({ id: "a", x: 0, y: 0 }), body({ id: "b", x: 0.05, y: 0.02 })];
    expect(isCollectible(bodies, "a")).toBe(true);
  });

  it("is not blocked by a body above it that does not overlap in XZ", () => {
    const bodies = [body({ id: "a", x: 0, y: 0 }), body({ id: "b", x: 5, y: 0.3 })];
    expect(isCollectible(bodies, "a")).toBe(true);
  });

  it("returns false for an unknown id", () => {
    expect(isCollectible([body({ id: "a" })], "missing")).toBe(false);
  });
});

describe("computeBurial", () => {
  it("is low for an exposed item near the container centre with nothing on top", () => {
    const bodies = [body({ id: "a", x: 0, y: 0 })];
    expect(computeBurial(bodies, "a", 1.5)).toBeLessThan(0.3);
  });

  it("is higher for an item with something resting on top of it", () => {
    const bare = computeBurial([body({ id: "a", x: 0, y: 0 })], "a", 1.5);
    const covered = computeBurial(
      [body({ id: "a", x: 0, y: 0 }), body({ id: "b", x: 0.02, y: 0.4 })],
      "a",
      1.5,
    );
    expect(covered).toBeGreaterThan(bare);
  });

  it("is lower near the container edge than at the centre, all else equal", () => {
    const centre = computeBurial([body({ id: "a", x: 0, y: 0 })], "a", 1.5);
    const edge = computeBurial([body({ id: "a", x: 1.45, y: 0 })], "a", 1.5);
    expect(edge).toBeLessThan(centre);
  });

  it("stays within [0, 1]", () => {
    const bodies = [
      body({ id: "a", x: 0, y: 0 }),
      body({ id: "b", x: 0.02, y: 0.4 }),
      body({ id: "c", x: 0.01, y: 0.8 }),
      body({ id: "d", x: 0.03, y: 1.2 }),
    ];
    const burial = computeBurial(bodies, "a", 1.5);
    expect(burial).toBeGreaterThanOrEqual(0);
    expect(burial).toBeLessThanOrEqual(1);
  });

  it("returns 1 for an unknown id", () => {
    expect(computeBurial([body({ id: "a" })], "missing", 1.5)).toBe(1);
  });
});
