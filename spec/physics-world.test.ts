import { describe, expect, it } from "vitest";
import { PhysicsWorld } from "../physics-world";
import type { ItemSpawn } from "../levels";

function spawn(id: string, kind: string, x: number, y: number, z: number): ItemSpawn {
  return { id, kind, x, y, z, rotX: 0, rotY: 0, rotZ: 0 };
}

function settle(world: PhysicsWorld, seconds: number) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) world.step(dt);
}

describe("PhysicsWorld", () => {
  it("settles a dropped body to rest on the floor within tolerance", () => {
    const world = new PhysicsWorld(2);
    world.spawn(spawn("a", "corn", 0, 1, 0));
    settle(world, 3);
    const pos = world.snapshot("a")!;
    // corn's footprintRadius is 0.18 (a sphere collider), so it should come
    // to rest with its centre at roughly that height above the floor.
    expect(pos.y).toBeGreaterThan(0.1);
    expect(pos.y).toBeLessThan(0.3);
  });

  it("removing a load-bearing body causes only local resettling, not a whole-pile collapse", () => {
    const world = new PhysicsWorld(2.5);

    // A small stack: base, then a load-bearing body on top of it, then a
    // body resting on that.
    world.spawn(spawn("base", "cabbage", 0, 0.3, 0));
    world.spawn(spawn("bearing", "cabbage", 0, 0.95, 0));
    world.spawn(spawn("rider", "corn", 0.02, 1.55, 0));

    // A body far away, structurally unrelated to the stack, near the
    // opposite edge of the container.
    world.spawn(spawn("distant", "corn", 2.0, 0.3, 2.0));

    settle(world, 4);

    const distantBefore = world.snapshot("distant")!;
    const riderBefore = world.snapshot("rider")!;

    world.remove("bearing");
    settle(world, 4);

    const distantAfter = world.snapshot("distant")!;
    const riderAfter = world.snapshot("rider")!;

    const distantDisplacement = Math.hypot(
      distantAfter.x - distantBefore.x,
      distantAfter.y - distantBefore.y,
      distantAfter.z - distantBefore.z,
    );
    const riderDisplacement = Math.hypot(
      riderAfter.x - riderBefore.x,
      riderAfter.y - riderBefore.y,
      riderAfter.z - riderBefore.z,
    );

    // The rider, which was directly resting on the removed body, should
    // drop noticeably. The distant, unrelated body should barely move at
    // all -- this is the actual tripwire against a "whole pile collapses"
    // regression.
    expect(riderDisplacement).toBeGreaterThan(0.05);
    expect(distantDisplacement).toBeLessThan(0.03);
  });

  it("applyImpulse nudges a body without throwing for an unknown id", () => {
    const world = new PhysicsWorld(2);
    world.spawn(spawn("a", "corn", 0, 0.5, 0));
    expect(() => world.applyImpulse("a", { x: 1, y: 0, z: 0 })).not.toThrow();
    expect(() => world.applyImpulse("missing", { x: 1, y: 0, z: 0 })).not.toThrow();
  });
});
