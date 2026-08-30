// Procedural three.js meshes built from primitive geometries, combined per
// kind for a distinct, recognizable silhouette. Deliberate scope decision,
// not a shortcut under pressure: a one-week course prototype has no
// sculpted/downloaded asset pipeline, so every item is still built from
// Box/Sphere/Cylinder/Cone/Capsule/Icosahedron/Lathe/Extrude/Torus
// primitives -- just composed with more parts, vertex displacement for
// organic bumps, and revolved/extruded profiles where a single primitive
// can't express the shape (carrot, garlic, feather). This file is
// visual-only and has no meaningful unit test -- "does this look like a
// corn cob" is a judgment call, same class of thing as last week's
// untestable AudioContext output.

import * as THREE from "three";
import { findItemKind } from "./item-kinds";

function group(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const part of parts) g.add(part);
  return g;
}

interface MeshOpts {
  roughness?: number;
  metalness?: number;
}

function mesh(geometry: THREE.BufferGeometry, color: string, opts: MeshOpts = {}): THREE.Mesh {
  const m = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.7, metalness: opts.metalness ?? 0 }),
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Nudges each vertex along its own normal by a small random offset, for
// organic lumpy surfaces (potato/ginger/garlic/cabbage/peanut) without
// needing textures. Purely visual and re-run per built mesh, so per-instance
// randomness is fine -- every spawned item ends up subtly unique.
function displaceLumpy(geometry: THREE.BufferGeometry, amount: number): THREE.BufferGeometry {
  geometry.computeVertexNormals();
  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const offset = (Math.random() * 2 - 1) * amount;
    pos.setXYZ(
      i,
      pos.getX(i) + normal.getX(i) * offset,
      pos.getY(i) + normal.getY(i) * offset,
      pos.getZ(i) + normal.getZ(i) * offset,
    );
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// Revolves a 2D [radius, y] profile around the Y axis -- for tapered/rounded
// organic silhouettes (carrot, garlic/onion bulbs, eggplant) that a single
// primitive can't express.
function lathe(profile: Array<[number, number]>, color: string, segments = 14, opts: MeshOpts = {}): THREE.Mesh {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return mesh(new THREE.LatheGeometry(points, segments), color, opts);
}

// Extrudes a flat 2D silhouette to a thin solid -- for a proper feather/leaf
// outline instead of a flat box.
function extrudeFlat(points: Array<[number, number]>, depth: number, color: string): THREE.Mesh {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.center();
  return mesh(geo, color, { roughness: 0.75 });
}

function speck(color: string, radius: number): THREE.Mesh {
  const m = mesh(new THREE.SphereGeometry(radius, 6, 5), color);
  m.scale.set(1, 0.4, 1);
  return m;
}

function buildCorn(color: string): THREE.Object3D {
  const cob = mesh(new THREE.CapsuleGeometry(0.12, 0.28, 4, 12), "#e8d18a");
  cob.rotation.z = Math.PI / 2;
  const parts: THREE.Object3D[] = [cob];
  const rows = 5;
  const perRow = 7;
  for (let row = 0; row < rows; row++) {
    const t = (row + 0.5) / rows;
    const x = -0.13 + t * 0.26;
    const rowRadius = 0.1 + 0.03 * Math.sin(t * Math.PI);
    for (let i = 0; i < perRow; i++) {
      const angle = (i / perRow) * Math.PI * 2 + row * 0.25;
      const kernel = mesh(new THREE.SphereGeometry(0.022, 6, 5), color);
      kernel.position.set(x, Math.sin(angle) * rowRadius, Math.cos(angle) * rowRadius);
      parts.push(kernel);
    }
  }
  const husk1 = extrudeFlat(
    [
      [0, 0],
      [0.045, 0.06],
      [0.02, 0.2],
      [0, 0.24],
      [-0.02, 0.2],
      [-0.045, 0.06],
    ],
    0.012,
    "#3f7d2e",
  );
  husk1.position.set(-0.22, -0.02, 0);
  husk1.rotation.set(0, 0, Math.PI / 2 + 0.35);
  const husk2 = husk1.clone();
  husk2.rotation.z = Math.PI / 2 - 0.35;
  husk2.rotation.y = Math.PI / 2;
  parts.push(husk1, husk2);
  return group(...parts);
}

function buildEgg(color: string): THREE.Object3D {
  const m = mesh(new THREE.SphereGeometry(0.16, 20, 16), color, { roughness: 0.35 });
  m.scale.set(0.85, 1.15, 0.85);
  return m;
}

function buildBread(color: string): THREE.Object3D {
  const lobe1 = mesh(new THREE.SphereGeometry(0.19, 14, 10), color);
  lobe1.scale.set(1.1, 0.7, 0.9);
  lobe1.position.set(-0.1, 0, 0);
  const lobe2 = mesh(new THREE.SphereGeometry(0.16, 14, 10), color);
  lobe2.scale.set(1.05, 0.65, 0.85);
  lobe2.position.set(0.13, -0.01, 0);
  const parts: THREE.Object3D[] = [lobe1, lobe2];
  for (let i = 0; i < 3; i++) {
    const slash = mesh(new THREE.BoxGeometry(0.16, 0.015, 0.02), "#7a4c22");
    slash.position.set(-0.06 + i * 0.09, 0.09, 0);
    slash.rotation.y = Math.PI / 5;
    parts.push(slash);
  }
  return group(...parts);
}

function buildGoose(color: string): THREE.Object3D {
  const body = mesh(new THREE.SphereGeometry(0.22, 14, 10), color);
  body.scale.set(1.25, 1, 1.05);
  const neckLower = mesh(new THREE.CapsuleGeometry(0.06, 0.12, 4, 8), color);
  neckLower.position.set(0.18, 0.14, 0);
  neckLower.rotation.z = -Math.PI / 3.2;
  const neckUpper = mesh(new THREE.CapsuleGeometry(0.055, 0.1, 4, 8), color);
  neckUpper.position.set(0.28, 0.27, 0);
  neckUpper.rotation.z = -Math.PI / 8;
  const head = mesh(new THREE.SphereGeometry(0.09, 12, 10), color);
  head.position.set(0.35, 0.34, 0);
  const beak = mesh(new THREE.ConeGeometry(0.028, 0.09, 6), "#f0a500");
  beak.position.set(0.44, 0.34, 0);
  beak.rotation.z = -Math.PI / 2;
  const eye = mesh(new THREE.SphereGeometry(0.012, 6, 5), "#222222");
  eye.position.set(0.38, 0.36, 0.06);
  const wing = mesh(new THREE.SphereGeometry(0.15, 10, 8), "#e2e2e2");
  wing.scale.set(1, 0.5, 0.7);
  wing.position.set(-0.02, 0.03, 0.1);
  wing.rotation.y = 0.3;
  const tail: THREE.Object3D[] = [];
  for (let i = 0; i < 3; i++) {
    const feather = mesh(new THREE.ConeGeometry(0.025, 0.14, 6), "#e2e2e2");
    feather.position.set(-0.26, 0.02, -0.05 + i * 0.05);
    feather.rotation.z = Math.PI / 2 + 0.15 * (i - 1);
    tail.push(feather);
  }
  return group(body, neckLower, neckUpper, head, beak, eye, wing, ...tail);
}

function buildCarrot(color: string): THREE.Object3D {
  const root = lathe(
    [
      [0, 0],
      [0.015, 0.01],
      [0.045, 0.06],
      [0.075, 0.16],
      [0.095, 0.3],
      [0.1, 0.42],
    ],
    color,
    12,
  );
  const parts: THREE.Object3D[] = [root];
  for (let i = 0; i < 4; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.018, 0.14 + i * 0.01, 5), "#3f7d2e");
    leaf.position.set(0.02 * (i - 1.5), 0.44, 0.015 * (i % 2 === 0 ? 1 : -1));
    leaf.rotation.z = 0.15 * (i - 1.5);
    parts.push(leaf);
  }
  return group(...parts);
}

function buildCabbage(color: string): THREE.Object3D {
  const parts: THREE.Object3D[] = [];
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const radius = 0.14 + i * 0.045;
    const geo = new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65);
    displaceLumpy(geo, 0.008);
    const leaf = mesh(geo, i === layers - 1 ? "#5f9440" : color);
    leaf.rotation.y = i * 0.9;
    leaf.rotation.x = Math.PI + i * 0.05;
    leaf.position.y = -0.03 + i * 0.01;
    parts.push(leaf);
  }
  return group(...parts);
}

function buildSpacePepper(color: string): THREE.Object3D {
  const bodyGeo = new THREE.CapsuleGeometry(0.09, 0.2, 4, 10);
  displaceLumpy(bodyGeo, 0.004);
  const body = mesh(bodyGeo, color, { roughness: 0.4 });
  body.rotation.z = Math.PI / 7;
  const stem = mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.06, 6), "#3f7d2e");
  stem.position.set(-0.02, 0.19, 0);
  const cap = mesh(new THREE.ConeGeometry(0.03, 0.03, 6), "#3f7d2e");
  cap.position.set(-0.02, 0.16, 0);
  return group(body, stem, cap);
}

function buildGinger(color: string): THREE.Object3D {
  const geo = new THREE.IcosahedronGeometry(0.16, 1);
  displaceLumpy(geo, 0.022);
  const body = mesh(geo, color);
  const patch = mesh(new THREE.SphereGeometry(0.05, 8, 6), "#f0e4c4");
  patch.scale.set(1, 0.4, 1);
  patch.position.set(0.11, 0.05, 0.05);
  return group(body, patch);
}

function buildGarlic(color: string): THREE.Object3D {
  const bulb = lathe(
    [
      [0, -0.11],
      [0.09, -0.09],
      [0.12, -0.02],
      [0.1, 0.06],
      [0.04, 0.11],
      [0, 0.12],
    ],
    color,
  );
  const tip = mesh(new THREE.ConeGeometry(0.025, 0.05, 6), "#f7f3e3");
  tip.position.y = 0.15;
  const parts: THREE.Object3D[] = [bulb, tip];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const groove = mesh(new THREE.BoxGeometry(0.006, 0.16, 0.006), "#d8cba0");
    groove.position.set(Math.cos(angle) * 0.1, -0.03, Math.sin(angle) * 0.1);
    parts.push(groove);
  }
  return group(...parts);
}

function buildMushroom(color: string): THREE.Object3D {
  const capGeo = new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  displaceLumpy(capGeo, 0.004);
  const cap = mesh(capGeo, color);
  cap.position.y = 0.09;
  const specks: THREE.Object3D[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const r = 0.06 + (i % 2) * 0.05;
    const dot = speck("#f5ecd7", 0.018);
    dot.position.set(Math.cos(angle) * r, 0.16, Math.sin(angle) * r);
    specks.push(dot);
  }
  const gill = mesh(new THREE.TorusGeometry(0.14, 0.012, 6, 16), "#6b4a33");
  gill.rotation.x = Math.PI / 2;
  gill.position.y = 0.03;
  const stem = mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.18, 10), "#efe4c8");
  stem.position.y = -0.05;
  return group(cap, gill, stem, ...specks);
}

function buildPotato(color: string): THREE.Object3D {
  const geo = new THREE.SphereGeometry(0.17, 14, 10);
  displaceLumpy(geo, 0.016);
  const body = mesh(geo, color);
  body.scale.set(1.1, 0.9, 1);
  const parts: THREE.Object3D[] = [body];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.4;
    const eye = speck("#5a4326", 0.012);
    eye.position.set(Math.cos(angle) * 0.15, 0.02 * (i - 2), Math.sin(angle) * 0.13);
    parts.push(eye);
  }
  return group(...parts);
}

function buildTomato(color: string): THREE.Object3D {
  const body = mesh(new THREE.SphereGeometry(0.16, 16, 12), color, { roughness: 0.3 });
  const parts: THREE.Object3D[] = [body];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leaf = mesh(new THREE.ConeGeometry(0.02, 0.04, 5), "#3f7d2e");
    leaf.position.set(Math.cos(angle) * 0.03, 0.16, Math.sin(angle) * 0.03);
    leaf.rotation.x = Math.PI;
    parts.push(leaf);
  }
  return group(...parts);
}

function buildWheatSheaf(color: string): THREE.Object3D {
  const parts: THREE.Object3D[] = [];
  const stalks = 6;
  for (let i = 0; i < stalks; i++) {
    const t = (i - (stalks - 1) / 2) / stalks;
    const stalk = mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.4, 5), color);
    stalk.position.set(t * 0.05, 0, t * 0.02);
    stalk.rotation.z = t * 0.5;
    parts.push(stalk);
    const ear = mesh(new THREE.ConeGeometry(0.02, 0.09, 6), "#b98f2e");
    ear.position.set(t * 0.05 + Math.sin(t * 0.5) * 0.18, 0.24, t * 0.02);
    ear.rotation.z = t * 0.5;
    parts.push(ear);
  }
  const tie = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), "#7a4c22");
  tie.rotation.x = Math.PI / 2;
  parts.push(tie);
  return group(...parts);
}

function buildFeather(color: string): THREE.Object3D {
  const vane = extrudeFlat(
    [
      [0, -0.16],
      [0.05, -0.1],
      [0.065, 0.02],
      [0.04, 0.12],
      [0, 0.16],
      [-0.04, 0.12],
      [-0.065, 0.02],
      [-0.05, -0.1],
    ],
    0.006,
    color,
  );
  const quill = mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.34, 5), "#e6e0c8");
  quill.position.z = 0.004;
  return group(vane, quill);
}

function buildDrumstick(color: string): THREE.Object3D {
  const bone = mesh(new THREE.CapsuleGeometry(0.07, 0.16, 4, 10), "#e8d9b0");
  bone.rotation.z = Math.PI / 2;
  bone.position.x = -0.1;
  const meatGeo = new THREE.SphereGeometry(0.15, 14, 10);
  displaceLumpy(meatGeo, 0.006);
  const meat = mesh(meatGeo, color, { roughness: 0.45 });
  meat.scale.set(1.1, 1, 1);
  meat.position.x = 0.02;
  const frill = mesh(new THREE.TorusGeometry(0.045, 0.02, 6, 12), "#fafafa");
  frill.position.x = -0.22;
  frill.rotation.y = Math.PI / 2;
  return group(bone, meat, frill);
}

function buildOnion(color: string): THREE.Object3D {
  const bulb = lathe(
    [
      [0, -0.1],
      [0.1, -0.08],
      [0.13, 0],
      [0.1, 0.09],
      [0.03, 0.14],
      [0, 0.15],
    ],
    color,
  );
  const wisp = mesh(new THREE.ConeGeometry(0.015, 0.06, 5), "#d9c896");
  wisp.position.y = 0.17;
  return group(bulb, wisp);
}

function buildPumpkin(color: string): THREE.Object3D {
  const bodyGeo = new THREE.SphereGeometry(0.2, 16, 12);
  displaceLumpy(bodyGeo, 0.004);
  const body = mesh(bodyGeo, color);
  body.scale.set(1, 0.8, 1);
  const parts: THREE.Object3D[] = [body];
  const ridgeCount = 8;
  for (let i = 0; i < ridgeCount; i++) {
    const angle = (i / ridgeCount) * Math.PI * 2;
    const ridge = mesh(new THREE.BoxGeometry(0.03, 0.16, 0.01), "#c06f12");
    ridge.position.set(Math.cos(angle) * 0.195, 0, Math.sin(angle) * 0.195);
    ridge.rotation.y = -angle;
    parts.push(ridge);
  }
  const stem = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.1, 6), "#5a7d3a");
  stem.position.y = 0.14;
  parts.push(stem);
  return group(...parts);
}

function buildEggplant(color: string): THREE.Object3D {
  const body = lathe(
    [
      [0, 0],
      [0.03, 0.02],
      [0.09, 0.1],
      [0.11, 0.22],
      [0.08, 0.32],
      [0.02, 0.36],
      [0, 0.37],
    ],
    color,
    14,
    { roughness: 0.35 },
  );
  const calyx: THREE.Object3D[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leaf = mesh(new THREE.ConeGeometry(0.02, 0.05, 6), "#4d7a3a");
    leaf.position.set(Math.cos(angle) * 0.03, 0.37, Math.sin(angle) * 0.03);
    leaf.rotation.x = Math.PI;
    calyx.push(leaf);
  }
  return group(body, ...calyx);
}

function buildPeanut(color: string): THREE.Object3D {
  const lobe1Geo = new THREE.SphereGeometry(0.09, 10, 8);
  displaceLumpy(lobe1Geo, 0.006);
  const lobe1 = mesh(lobe1Geo, color);
  lobe1.position.x = -0.07;
  const lobe2Geo = new THREE.SphereGeometry(0.08, 10, 8);
  displaceLumpy(lobe2Geo, 0.006);
  const lobe2 = mesh(lobe2Geo, color);
  lobe2.position.x = 0.08;
  const waist = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), color);
  waist.rotation.z = Math.PI / 2;
  return group(lobe1, waist, lobe2);
}

function buildScallion(color: string): THREE.Object3D {
  const base = mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.16, 8), color);
  base.position.y = -0.1;
  const blade = mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.32, 6), "#5f9a4a");
  blade.position.y = 0.08;
  return group(base, blade);
}

const BUILDERS: Record<string, (color: string) => THREE.Object3D> = {
  corn: buildCorn,
  egg: buildEgg,
  bread: buildBread,
  goose: buildGoose,
  carrot: buildCarrot,
  cabbage: buildCabbage,
  "space-pepper": buildSpacePepper,
  ginger: buildGinger,
  garlic: buildGarlic,
  mushroom: buildMushroom,
  potato: buildPotato,
  tomato: buildTomato,
  "wheat-sheaf": buildWheatSheaf,
  feather: buildFeather,
  drumstick: buildDrumstick,
  onion: buildOnion,
  pumpkin: buildPumpkin,
  eggplant: buildEggplant,
  peanut: buildPeanut,
  scallion: buildScallion,
};

export function buildItemMesh(kind: string): THREE.Object3D {
  const def = findItemKind(kind);
  const builder = BUILDERS[kind];
  if (!builder) throw new Error(`no mesh builder registered for kind: ${kind}`);
  return builder(def.color);
}
