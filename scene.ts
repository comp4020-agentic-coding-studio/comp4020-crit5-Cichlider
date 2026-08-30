// The glue layer: three.js rendering + cannon-es physics + raycasting +
// shake input + DOM HUD, all wired together. This file is visual-only and
// has no meaningful unit test (camera/render loop/raycasting/device input
// can only be judged by looking) --- same class of limitation as last
// week's untestable AudioContext, just a much larger surface. All the rules
// it calls into (game.ts, occlusion.ts, shake.ts's pure core, physics-world.ts)
// are unit-tested on their own.

import * as THREE from "three";
import { collect, createGame, tick, type GameConfig, type GameState } from "./game";
import { findItemKind } from "./item-kinds";
import { buildItemMesh } from "./mesh-library";
import type { Level } from "./levels";
import { computeBurial, isCollectible, type BodySnapshot } from "./occlusion";
import { PhysicsWorld } from "./physics-world";
import { burialToImpulseScale, computeShakeImpulse, type Vec2 } from "./shake";
import { flyToSlot } from "./tray";

export interface SceneDom {
  canvas: HTMLCanvasElement;
  rack: HTMLElement;
  timerEl: HTMLElement;
  banner: HTMLElement;
  shakeHint: HTMLElement | null;
}

export interface SceneOptions {
  level: Level;
  config: GameConfig;
  onWin: () => void;
  onLose: (reason: "timeout" | "overflow") => void;
}

export interface SceneHandle {
  dispose(): void;
}

const SHAKE_BASE_IMPULSE = 1.4;
const DRAG_DECAY = 0.85;
const CLICK_MOVE_THRESHOLD = 6;

export function createScene(dom: SceneDom, opts: SceneOptions): SceneHandle {
  const { canvas, rack: rackEl, timerEl, banner, shakeHint } = dom;
  const { level, config } = opts;

  let disposed = false;
  let reported = false;
  let state: GameState = createGame(level.spawns, config);
  const pendingCollectIds = new Set<string>();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#cfe0ef");

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, level.containerRadius * 3.4, level.containerRadius * 1.1);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(2, 4, 2);
  sun.castShadow = true;
  scene.add(sun);

  const floorMesh = new THREE.Mesh(
    new THREE.CircleGeometry(level.containerRadius, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: "#8a6b3f" }),
  );
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // The physics walls (physics-world.ts) are taller than this for real
  // containment; the visible wall is deliberately shorter so it doesn't
  // block the camera's view down into the pile from this angle.
  const visualWallHeight = 0.7;
  const wallMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(level.containerRadius, level.containerRadius, visualWallHeight, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: "#5a432a", side: THREE.DoubleSide }),
  );
  wallMesh.position.y = visualWallHeight / 2;
  scene.add(wallMesh);

  const physics = new PhysicsWorld(level.containerRadius);
  const meshes = new Map<string, THREE.Object3D>();

  for (const spawn of level.spawns) {
    physics.spawn(spawn);
    const mesh = buildItemMesh(spawn.kind);
    mesh.position.set(spawn.x, spawn.y, spawn.z);
    mesh.traverse((o: THREE.Object3D) => {
      o.userData.itemId = spawn.id;
    });
    scene.add(mesh);
    meshes.set(spawn.id, mesh);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  function renderRack() {
    if (rackEl.children.length !== state.config.rackCapacity) {
      rackEl.innerHTML = "";
      for (let i = 0; i < state.config.rackCapacity; i++) {
        const slot = document.createElement("div");
        slot.className = "slot";
        rackEl.appendChild(slot);
      }
    }
    for (let i = 0; i < state.config.rackCapacity; i++) {
      const slot = rackEl.children[i] as HTMLElement;
      const kind = state.rack[i];
      slot.style.background = kind ? findItemKind(kind).color : "";
      slot.classList.toggle("filled", Boolean(kind));
    }
  }

  function renderTimer() {
    const s = Math.ceil(state.timeRemaining);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function renderBanner() {
    if (state.status === "won") {
      banner.textContent = "抓到大鹅了 --- 你赢了。";
      banner.hidden = false;
    } else if (state.status === "lost") {
      banner.textContent = state.timeRemaining === 0 ? "时间到 --- 你输了。" : "槽位满了 --- 你输了。";
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  function reportOutcomeIfNeeded() {
    if (reported || state.status === "playing") return;
    reported = true;
    if (state.status === "won") opts.onWin();
    else opts.onLose(state.timeRemaining === 0 ? "timeout" : "overflow");
  }

  renderRack();
  renderTimer();
  renderBanner();

  function bodySnapshots(): BodySnapshot[] {
    return physics.allRecords().map((r) => {
      const def = findItemKind(r.kind);
      return {
        id: r.id,
        kind: r.kind,
        x: r.body.position.x,
        y: r.body.position.y,
        z: r.body.position.z,
        footprintRadius: def.footprintRadius,
        height: def.height,
      };
    });
  }

  let dragActive = false;
  let dragLast = { x: 0, y: 0 };
  let dragMoved = 0;
  let dragVelocity: Vec2 = { x: 0, z: 0 };
  let deviceShakeVector: Vec2 = { x: 0, z: 0 };

  function handleClickAt(clientX: number, clientY: number) {
    if (state.status !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(Array.from(meshes.values()), true);
    if (hits.length === 0) return;
    const id = hits[0].object.userData.itemId as string | undefined;
    if (!id || pendingCollectIds.has(id) || !state.remaining.has(id)) return;

    const snapshots = bodySnapshots();
    if (!isCollectible(snapshots, id)) return;

    const mesh = meshes.get(id);
    if (!mesh) return;
    const kind = state.remaining.get(id)!;
    const color = findItemKind(kind).color;

    pendingCollectIds.add(id);
    const slotIndex = Math.min(state.rack.length, state.config.rackCapacity - 1);
    const slotEl = rackEl.children[slotIndex] as HTMLElement;

    flyToSlot({
      camera,
      canvas,
      worldPosition: mesh.getWorldPosition(new THREE.Vector3()),
      slotEl,
      color,
      onArrive: () => {
        pendingCollectIds.delete(id);
        state = collect(state, id);
        physics.remove(id);
        scene.remove(mesh);
        meshes.delete(id);
        renderRack();
        renderBanner();
        reportOutcomeIfNeeded();
      },
    });
  }

  function onPointerDown(ev: PointerEvent) {
    dragActive = true;
    dragMoved = 0;
    dragLast = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
  }

  function onPointerMove(ev: PointerEvent) {
    if (!dragActive) return;
    const dx = ev.clientX - dragLast.x;
    const dy = ev.clientY - dragLast.y;
    dragMoved += Math.hypot(dx, dy);
    dragVelocity = { x: dx * 0.02, z: dy * 0.02 };
    dragLast = { x: ev.clientX, y: ev.clientY };
  }

  function onPointerUp(ev: PointerEvent) {
    if (!dragActive) return;
    dragActive = false;
    dragVelocity = { x: 0, z: 0 };
    if (dragMoved < CLICK_MOVE_THRESHOLD) handleClickAt(ev.clientX, ev.clientY);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  function onDeviceMotion(ev: DeviceMotionEvent) {
    const acc = ev.accelerationIncludingGravity;
    if (!acc) return;
    deviceShakeVector = { x: (acc.x ?? 0) * 0.15, z: (acc.y ?? 0) * 0.15 };
  }

  function enableDeviceMotion() {
    const DeviceMotionEventCtor = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DeviceMotionEventCtor?.requestPermission === "function") {
      DeviceMotionEventCtor.requestPermission()
        .then((permission) => {
          if (permission === "granted") window.addEventListener("devicemotion", onDeviceMotion);
        })
        .catch(() => {});
    } else if (typeof DeviceMotionEvent !== "undefined") {
      window.addEventListener("devicemotion", onDeviceMotion);
    }
    if (shakeHint) shakeHint.hidden = true;
  }

  if (shakeHint) shakeHint.addEventListener("click", enableDeviceMotion, { once: true });

  function applyShake() {
    const vx = dragVelocity.x + deviceShakeVector.x;
    const vz = dragVelocity.z + deviceShakeVector.z;
    if (Math.abs(vx) < 1e-4 && Math.abs(vz) < 1e-4) return;
    const snapshots = bodySnapshots();
    for (const snap of snapshots) {
      const burial = computeBurial(snapshots, snap.id, level.containerRadius);
      if (burialToImpulseScale(burial) <= 0) continue;
      const impulse = computeShakeImpulse(burial, { x: vx, z: vz }, SHAKE_BASE_IMPULSE);
      physics.applyImpulse(snap.id, impulse);
    }
  }

  let rafId = 0;
  let lastTime = performance.now();

  function loop(now: number) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (state.status === "playing") {
      state = tick(state, dt);
      renderTimer();
      if (state.status !== "playing") {
        renderBanner();
        reportOutcomeIfNeeded();
      }
    }

    applyShake();
    dragVelocity = { x: dragVelocity.x * DRAG_DECAY, z: dragVelocity.z * DRAG_DECAY };
    deviceShakeVector = { x: deviceShakeVector.x * DRAG_DECAY, z: deviceShakeVector.z * DRAG_DECAY };

    physics.step(dt);

    for (const [id, mesh] of meshes) {
      const record = physics.getRecord(id);
      if (!record) continue;
      const pos = record.body.position;
      const quat = record.body.quaternion;
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("devicemotion", onDeviceMotion);
      renderer.dispose();
    },
  };
}
