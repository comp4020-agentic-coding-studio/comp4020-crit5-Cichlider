// DOM-side "fly into the rack" animation. Visual-only, no unit test possible
// here (transitionend timing, layout geometry) --- same class of thing as
// scene.ts's render loop. The important contract this enforces for game.ts
// is temporal: onArrive (which is where the caller actually calls
// game.collect()) only fires once the flight visually completes, so
// collection commits on animation-arrival, not on click.

import * as THREE from "three";

export interface FlyToSlotOptions {
  camera: THREE.Camera;
  canvas: HTMLCanvasElement;
  worldPosition: THREE.Vector3;
  slotEl: HTMLElement;
  color: string;
  onArrive: () => void;
}

let overlay: HTMLElement | undefined;

function getOverlay(): HTMLElement {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = "fly-overlay";
  document.body.appendChild(overlay);
  return overlay;
}

export function flyToSlot(opts: FlyToSlotOptions): void {
  const { camera, canvas, worldPosition, slotEl, color, onArrive } = opts;

  const ndc = worldPosition.clone().project(camera);
  const canvasRect = canvas.getBoundingClientRect();
  const startX = canvasRect.left + ((ndc.x + 1) / 2) * canvasRect.width;
  const startY = canvasRect.top + ((1 - ndc.y) / 2) * canvasRect.height;

  const slotRect = slotEl.getBoundingClientRect();
  const endX = slotRect.left + slotRect.width / 2;
  const endY = slotRect.top + slotRect.height / 2;

  const flyEl = document.createElement("div");
  flyEl.className = "fly-item";
  flyEl.style.background = color;
  flyEl.style.left = `${startX}px`;
  flyEl.style.top = `${startY}px`;
  getOverlay().appendChild(flyEl);

  // Force layout so the initial position is committed before the transition
  // to the target position starts.
  flyEl.getBoundingClientRect();

  let settled = false;
  const arrive = () => {
    if (settled) return;
    settled = true;
    flyEl.remove();
    onArrive();
  };

  flyEl.addEventListener("transitionend", arrive, { once: true });
  // A safety timeout in case transitionend never fires (e.g. the element
  // was already at its destination, or a test/headless quirk suppresses
  // the event) --- the game must still progress.
  window.setTimeout(arrive, 500);

  requestAnimationFrame(() => {
    flyEl.style.left = `${endX}px`;
    flyEl.style.top = `${endY}px`;
    flyEl.style.transform = "translate(-50%, -50%) scale(0.4)";
    flyEl.style.opacity = "0.6";
  });
}
