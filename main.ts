// Thin bootstrap only: pick a level, hand the DOM + level off to scene.ts,
// and wire the restart button. All game rules live in game.ts; all
// rendering/physics/input live in scene.ts.

import { generateLevel1, generateLevel2 } from "./levels";
import { createScene, type SceneHandle } from "./scene";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const rack = document.getElementById("rack")!;
const timerEl = document.getElementById("timer")!;
const banner = document.getElementById("banner")!;
const restartBtn = document.getElementById("restart")!;
const shakeHint = document.getElementById("enable-shake");

let handle: SceneHandle | undefined;

function startLevel1() {
  handle?.dispose();
  handle = createScene(
    { canvas, rack, timerEl, banner, shakeHint },
    {
      level: generateLevel1(Math.random),
      config: { rackCapacity: 7, timeLimitSeconds: 90 },
      // Delay the switch so the "you win" banner is actually visible for a
      // moment before level 2 replaces the whole scene.
      onWin: () => window.setTimeout(startLevel2, 1800),
      onLose: () => {},
    },
  );
}

function startLevel2() {
  handle?.dispose();
  handle = createScene(
    { canvas, rack, timerEl, banner, shakeHint },
    {
      level: generateLevel2(Math.random),
      config: { rackCapacity: 7, timeLimitSeconds: 180 },
      onWin: () => {},
      onLose: () => {},
    },
  );
}

restartBtn.addEventListener("click", startLevel1);

startLevel1();
