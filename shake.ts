// The pure core of "颠锅" (pot-shake): plain numbers in, plain numbers out.
// Deliberately has no target-item-id parameter anywhere in its signatures ---
// it can only ever scale a shared shake vector by a body's own burial, so
// there is no code path by which it could single out and unbury one specific
// item. That's what keeps this a physical disturbance, not a shuffle.
//
// The live hookup (reading a real device's accelerometer, or a mouse drag on
// the canvas, and calling cannon-es's applyImpulse) lives in scene.ts and
// can't be unit-tested --- there's no `devicemotion` in a test environment,
// and "does this feel right" is a judgment call anyway, same class of thing
// as last week's untestable AudioContext scheduler.

export interface Vec2 {
  x: number;
  z: number;
}

/** Monotonic decreasing, steep falloff --- "somewhat buried" already moves
 * little, not a linear ramp, so digging out a deep item takes real clicking,
 * not just persistent shaking. */
export function burialToImpulseScale(burial: number): number {
  const clamped = Math.max(0, Math.min(1, burial));
  return (1 - clamped) ** 2;
}

export function computeShakeImpulse(
  burial: number,
  shakeVector: Vec2,
  baseImpulseMagnitude: number,
): { x: number; y: number; z: number } {
  const scale = burialToImpulseScale(burial);
  return {
    x: shakeVector.x * scale * baseImpulseMagnitude,
    y: scale * baseImpulseMagnitude * 0.25,
    z: shakeVector.z * scale * baseImpulseMagnitude,
  };
}
