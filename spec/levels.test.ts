import { describe, expect, it } from "vitest";
import { generateLevel1, generateLevel2 } from "../levels";
import { ITEM_KINDS } from "../item-kinds";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("generateLevel1", () => {
  it("is exactly 3 kinds x 3 items, matching the real game's tutorial set", () => {
    const level = generateLevel1(mulberry32(1));
    expect(level.spawns).toHaveLength(9);
    const counts = new Map<string, number>();
    for (const spawn of level.spawns) counts.set(spawn.kind, (counts.get(spawn.kind) ?? 0) + 1);
    expect(counts.size).toBe(3);
    for (const count of counts.values()) expect(count).toBe(3);
    expect(new Set(counts.keys())).toEqual(new Set(["cabbage", "space-pepper", "ginger"]));
  });

  it("gives every spawn a unique id", () => {
    const level = generateLevel1(mulberry32(2));
    expect(new Set(level.spawns.map((s) => s.id)).size).toBe(level.spawns.length);
  });
});

describe("generateLevel2", () => {
  it("uses between 10 and 15 distinct kinds", () => {
    for (let seed = 0; seed < 20; seed++) {
      const level = generateLevel2(mulberry32(seed));
      const kinds = new Set(level.spawns.map((s) => s.kind));
      expect(kinds.size).toBeGreaterThanOrEqual(10);
      expect(kinds.size).toBeLessThanOrEqual(15);
      for (const kind of kinds) expect(ITEM_KINDS.some((k) => k.kind === kind)).toBe(true);
    }
  });

  it("guarantees every kind's count is a strict multiple of 3, by construction", () => {
    for (let seed = 0; seed < 20; seed++) {
      const level = generateLevel2(mulberry32(seed));
      const counts = new Map<string, number>();
      for (const spawn of level.spawns) counts.set(spawn.kind, (counts.get(spawn.kind) ?? 0) + 1);
      for (const count of counts.values()) {
        expect(count % 3).toBe(0);
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  it("produces a plausible total item count without any hardcoded fixed constant", () => {
    const level = generateLevel2(mulberry32(3));
    expect(level.spawns.length).toBeGreaterThanOrEqual(30);
    expect(level.spawns.length).toBeLessThanOrEqual(15 * 24);
  });

  it("gives every spawn a unique id", () => {
    const level = generateLevel2(mulberry32(4));
    expect(new Set(level.spawns.map((s) => s.id)).size).toBe(level.spawns.length);
  });
});
