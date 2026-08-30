// Procedural three.js meshes built from primitive geometries, combined per
// kind for a distinct silhouette. Deliberate scope decision, not a shortcut
// under pressure: a one-week course prototype has no sculpted/downloaded
// asset pipeline, so every item is Box/Sphere/Cylinder/Cone/Capsule/
// Icosahedron composed together. This file is visual-only and has no
// meaningful unit test -- "does this look like a corn cob" is a judgment
// call, same class of thing as last week's untestable AudioContext output.

import * as THREE from "three";
import { findItemKind } from "./item-kinds";

function group(...parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const part of parts) g.add(part);
  return g;
}

function mesh(geometry: THREE.BufferGeometry, color: string): THREE.Mesh {
  const m = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildCorn(color: string): THREE.Object3D {
  const cob = mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), color);
  cob.rotation.z = Math.PI / 2;
  const husk = mesh(new THREE.ConeGeometry(0.1, 0.18, 8), "#3f7d2e");
  husk.position.x = -0.24;
  husk.rotation.z = Math.PI / 2;
  return group(cob, husk);
}

function buildEgg(color: string): THREE.Object3D {
  const m = mesh(new THREE.SphereGeometry(0.16, 12, 10), color);
  m.scale.set(0.85, 1.15, 0.85);
  return m;
}

function buildBread(color: string): THREE.Object3D {
  const loaf = mesh(new THREE.BoxGeometry(0.4, 0.2, 0.24), color);
  const dome = mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), color);
  dome.position.y = 0.1;
  return group(loaf, dome);
}

function buildGoose(color: string): THREE.Object3D {
  const body = mesh(new THREE.SphereGeometry(0.24, 12, 10), color);
  body.scale.set(1.2, 1, 1);
  const head = mesh(new THREE.SphereGeometry(0.1, 10, 8), color);
  head.position.set(0.22, 0.2, 0);
  const beak = mesh(new THREE.ConeGeometry(0.03, 0.1, 6), "#f0a500");
  beak.position.set(0.32, 0.2, 0);
  beak.rotation.z = -Math.PI / 2;
  return group(body, head, beak);
}

function buildCarrot(color: string): THREE.Object3D {
  const root = mesh(new THREE.ConeGeometry(0.1, 0.4, 8), color);
  root.rotation.x = Math.PI;
  const leaf = mesh(new THREE.ConeGeometry(0.04, 0.1, 6), "#3f7d2e");
  leaf.position.y = 0.25;
  return group(root, leaf);
}

function buildCabbage(color: string): THREE.Object3D {
  const m = mesh(new THREE.IcosahedronGeometry(0.22, 1), color);
  return m;
}

function buildSpacePepper(color: string): THREE.Object3D {
  const m = mesh(new THREE.CapsuleGeometry(0.09, 0.22, 4, 8), color);
  m.rotation.z = Math.PI / 8;
  return m;
}

function buildGinger(color: string): THREE.Object3D {
  return mesh(new THREE.IcosahedronGeometry(0.16, 0), color);
}

function buildGarlic(color: string): THREE.Object3D {
  const bulb = mesh(new THREE.SphereGeometry(0.12, 10, 8), color);
  const tip = mesh(new THREE.ConeGeometry(0.03, 0.06, 6), color);
  tip.position.y = 0.13;
  return group(bulb, tip);
}

function buildMushroom(color: string): THREE.Object3D {
  const cap = mesh(new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), color);
  cap.position.y = 0.08;
  const stem = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 8), "#efe4c8");
  stem.position.y = -0.04;
  return group(cap, stem);
}

function buildRoundVeg(color: string, radius: number): THREE.Object3D {
  return mesh(new THREE.SphereGeometry(radius, 10, 8), color);
}

function buildWheatSheaf(color: string): THREE.Object3D {
  const bundle = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 6), color);
  return bundle;
}

function buildFeather(color: string): THREE.Object3D {
  const m = mesh(new THREE.BoxGeometry(0.05, 0.32, 0.01), color);
  return m;
}

function buildDrumstick(color: string): THREE.Object3D {
  const bone = mesh(new THREE.CapsuleGeometry(0.08, 0.14, 4, 8), "#e8d9b0");
  bone.rotation.z = Math.PI / 2;
  const meat = mesh(new THREE.SphereGeometry(0.14, 10, 8), color);
  meat.position.x = -0.08;
  return group(bone, meat);
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
  potato: (color) => buildRoundVeg(color, 0.17),
  tomato: (color) => buildRoundVeg(color, 0.16),
  "wheat-sheaf": buildWheatSheaf,
  feather: buildFeather,
  drumstick: buildDrumstick,
};

export function buildItemMesh(kind: string): THREE.Object3D {
  const def = findItemKind(kind);
  const builder = BUILDERS[kind];
  if (!builder) throw new Error(`no mesh builder registered for kind: ${kind}`);
  return builder(def.color);
}
