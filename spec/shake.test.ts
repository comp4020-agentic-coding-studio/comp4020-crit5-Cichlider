import { describe, expect, it } from "vitest";
import { burialToImpulseScale, computeShakeImpulse } from "../shake";

describe("burialToImpulseScale", () => {
  it("is 1 at zero burial and 0 at full burial", () => {
    expect(burialToImpulseScale(0)).toBe(1);
    expect(burialToImpulseScale(1)).toBe(0);
  });

  it("is monotonically decreasing", () => {
    const samples = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1];
    for (let i = 1; i < samples.length; i++) {
      expect(burialToImpulseScale(samples[i])).toBeLessThanOrEqual(burialToImpulseScale(samples[i - 1]));
    }
  });

  it("falls off steeply, not linearly: a middling burial already moves little", () => {
    expect(burialToImpulseScale(0.5)).toBeLessThan(0.5);
  });

  it("clamps out-of-range input", () => {
    expect(burialToImpulseScale(-1)).toBe(1);
    expect(burialToImpulseScale(2)).toBe(0);
  });
});

describe("computeShakeImpulse", () => {
  it("scales the shake vector down as burial rises", () => {
    const exposed = computeShakeImpulse(0, { x: 1, z: 0 }, 10);
    const buried = computeShakeImpulse(0.9, { x: 1, z: 0 }, 10);
    expect(Math.abs(buried.x)).toBeLessThan(Math.abs(exposed.x));
  });

  it("produces zero impulse at full burial regardless of shake strength", () => {
    const impulse = computeShakeImpulse(1, { x: 1, z: 1 }, 999);
    expect(impulse.x).toBe(0);
    expect(impulse.y).toBe(0);
    expect(impulse.z).toBe(0);
  });

  it("has no target-item parameter in its signature: it cannot special-case any one item", () => {
    // Structural check, not behavioural: the function only ever takes a
    // burial number and a shared shake vector, so calling it with the same
    // arguments for two different bodies must produce the same result --
    // there is no id it could branch on to favour one over the other.
    const a = computeShakeImpulse(0.4, { x: 0.5, z: -0.2 }, 5);
    const b = computeShakeImpulse(0.4, { x: 0.5, z: -0.2 }, 5);
    expect(a).toEqual(b);
    expect(computeShakeImpulse.length).toBe(3);
  });
});
