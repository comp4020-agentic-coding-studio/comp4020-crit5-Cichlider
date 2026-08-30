// Pure data catalog --- no three.js/cannon-es types here, so this is trivially
// unit-testable and both mesh-library.ts (visuals) and physics-world.ts
// (collider sizing) read from the same source of truth.

export type ItemSize = "small" | "large";

export interface ItemKindDef {
  kind: string;
  size: ItemSize;
  /** XZ half-extent in meters --- spawn spacing, collider radius, occlusion footprint. */
  footprintRadius: number;
  /** Y extent in meters. */
  height: number;
  color: string;
}

export const ITEM_KINDS: ItemKindDef[] = [
  { kind: "corn", size: "small", footprintRadius: 0.18, height: 0.5, color: "#f4c430" },
  { kind: "egg", size: "small", footprintRadius: 0.16, height: 0.24, color: "#f5ecd7" },
  { kind: "bread", size: "large", footprintRadius: 0.26, height: 0.22, color: "#c98a4b" },
  { kind: "goose", size: "large", footprintRadius: 0.3, height: 0.4, color: "#f2f2f2" },
  { kind: "carrot", size: "small", footprintRadius: 0.14, height: 0.45, color: "#e8730a" },
  { kind: "cabbage", size: "large", footprintRadius: 0.28, height: 0.3, color: "#7fb24a" },
  { kind: "space-pepper", size: "small", footprintRadius: 0.15, height: 0.4, color: "#8b2fc9" },
  { kind: "ginger", size: "small", footprintRadius: 0.17, height: 0.2, color: "#e8d29a" },
  { kind: "garlic", size: "small", footprintRadius: 0.13, height: 0.22, color: "#f7f3e3" },
  { kind: "mushroom", size: "small", footprintRadius: 0.16, height: 0.28, color: "#a9714b" },
  { kind: "potato", size: "small", footprintRadius: 0.17, height: 0.24, color: "#b9895a" },
  { kind: "tomato", size: "small", footprintRadius: 0.16, height: 0.28, color: "#d33a2c" },
  { kind: "wheat-sheaf", size: "small", footprintRadius: 0.14, height: 0.5, color: "#d9b64a" },
  { kind: "feather", size: "small", footprintRadius: 0.12, height: 0.16, color: "#fafafa" },
  { kind: "drumstick", size: "large", footprintRadius: 0.22, height: 0.35, color: "#a9713f" },
  { kind: "onion", size: "small", footprintRadius: 0.16, height: 0.26, color: "#e8c9a0" },
  { kind: "pumpkin", size: "large", footprintRadius: 0.24, height: 0.26, color: "#e08a1e" },
  { kind: "eggplant", size: "small", footprintRadius: 0.14, height: 0.34, color: "#4a2f6b" },
  { kind: "peanut", size: "small", footprintRadius: 0.13, height: 0.18, color: "#d9b877" },
  { kind: "scallion", size: "small", footprintRadius: 0.1, height: 0.42, color: "#e9f5e1" },
];

export function findItemKind(kind: string): ItemKindDef {
  const def = ITEM_KINDS.find((k) => k.kind === kind);
  if (!def) throw new Error(`unknown item kind: ${kind}`);
  return def;
}
