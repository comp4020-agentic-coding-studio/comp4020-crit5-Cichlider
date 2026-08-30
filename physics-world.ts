// cannon-es world/body wrapper. This has no WebGL/DOM dependency at all, so
// its core settle/locality behavior is a headless vitest target
// (spec/physics-world.test.ts) even though the visual result (scene.ts) can
// only be checked by looking.
//
// Tuning here is what turns "removing a body" into "only its immediate
// neighbours resettle" rather than "the whole pile free-falls": moderate-high
// friction, low restitution, real linear/angular damping, a higher solver
// iteration count, and sleeping enabled so untouched bodies go structurally
// inert. There is no scripted "nudge neighbours" step anywhere below --- on
// removal we just delete the body and let gravity/contacts do the rest.

import * as CANNON from "cannon-es";
import { findItemKind } from "./item-kinds";
import type { ItemSpawn } from "./levels";

export interface PhysicsTuning {
  gravity: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  solverIterations: number;
  sleepSpeedLimit: number;
  sleepTimeLimit: number;
}

export const DEFAULT_TUNING: PhysicsTuning = {
  gravity: -9.82,
  friction: 0.6,
  restitution: 0.08,
  linearDamping: 0.4,
  angularDamping: 0.6,
  solverIterations: 14,
  sleepSpeedLimit: 0.12,
  sleepTimeLimit: 0.5,
};

export interface BodyRecord {
  id: string;
  kind: string;
  body: CANNON.Body;
}

export class PhysicsWorld {
  readonly world: CANNON.World;
  private readonly bodies = new Map<string, BodyRecord>();
  private readonly itemMaterial: CANNON.Material;

  constructor(containerRadius: number, containerHeight: number = 2, tuning: PhysicsTuning = DEFAULT_TUNING) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, tuning.gravity, 0) });
    this.world.allowSleep = true;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = tuning.solverIterations;

    this.itemMaterial = new CANNON.Material("item");
    const floorMaterial = new CANNON.Material("floor");
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.itemMaterial, this.itemMaterial, {
        friction: tuning.friction,
        restitution: tuning.restitution,
      }),
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.itemMaterial, floorMaterial, {
        friction: tuning.friction,
        restitution: tuning.restitution,
      }),
    );

    // Bounded, not an infinite plane: a body that somehow clears the wall
    // (a fast-moving item skimming over the open top of a tall pile) falls
    // straight through instead of coming to rest just outside the container,
    // visibly floating beside the pot.
    const floorBody = new CANNON.Body({ mass: 0, material: floorMaterial });
    const floorHalfExtent = containerRadius * 1.1;
    floorBody.addShape(new CANNON.Box(new CANNON.Vec3(floorHalfExtent, 0.05, floorHalfExtent)));
    floorBody.position.set(0, -0.05, 0);
    this.world.addBody(floorBody);

    const wallSegments = 16;
    const wallHeight = containerHeight;
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const nextAngle = ((i + 1) / wallSegments) * Math.PI * 2;
      const midAngle = (angle + nextAngle) / 2;
      const segmentLength = containerRadius * (2 * Math.sin(Math.PI / wallSegments));
      const wallBody = new CANNON.Body({ mass: 0, material: floorMaterial });
      // Thick enough that a fast shake-flung item can't tunnel straight
      // through in one physics step (a thin 0.05 panel let that happen).
      wallBody.addShape(new CANNON.Box(new CANNON.Vec3(segmentLength / 2, wallHeight / 2, 0.25)));
      wallBody.position.set(Math.cos(midAngle) * containerRadius, wallHeight / 2, Math.sin(midAngle) * containerRadius);
      wallBody.quaternion.setFromEuler(0, -midAngle + Math.PI / 2, 0);
      this.world.addBody(wallBody);
    }

    this.tuning = tuning;
  }

  private readonly tuning: PhysicsTuning;

  spawn(spawn: ItemSpawn): BodyRecord {
    const def = findItemKind(spawn.kind);
    const body = new CANNON.Body({
      mass: def.size === "large" ? 1.4 : 0.6,
      material: this.itemMaterial,
      linearDamping: this.tuning.linearDamping,
      angularDamping: this.tuning.angularDamping,
      allowSleep: true,
      sleepSpeedLimit: this.tuning.sleepSpeedLimit,
      sleepTimeLimit: this.tuning.sleepTimeLimit,
    });
    body.addShape(new CANNON.Sphere(def.footprintRadius));
    body.position.set(spawn.x, spawn.y, spawn.z);
    body.quaternion.setFromEuler(spawn.rotX, spawn.rotY, spawn.rotZ);
    this.world.addBody(body);

    const record: BodyRecord = { id: spawn.id, kind: spawn.kind, body };
    this.bodies.set(spawn.id, record);
    return record;
  }

  remove(id: string): void {
    const record = this.bodies.get(id);
    if (!record) return;
    this.world.removeBody(record.body);
    this.bodies.delete(id);
  }

  applyImpulse(id: string, impulse: { x: number; y: number; z: number }): void {
    const record = this.bodies.get(id);
    if (!record) return;
    record.body.wakeUp();
    record.body.applyImpulse(new CANNON.Vec3(impulse.x, impulse.y, impulse.z));
  }

  step(dt: number): void {
    this.world.step(dt);
  }

  getRecord(id: string): BodyRecord | undefined {
    return this.bodies.get(id);
  }

  allRecords(): BodyRecord[] {
    return Array.from(this.bodies.values());
  }

  snapshot(id: string): { x: number; y: number; z: number } | undefined {
    const record = this.bodies.get(id);
    if (!record) return undefined;
    return { x: record.body.position.x, y: record.body.position.y, z: record.body.position.z };
  }
}
