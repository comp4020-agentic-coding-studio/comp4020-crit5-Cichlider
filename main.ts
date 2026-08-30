import { collect, createGame, generateLevel, isVisible, tick, type GameState } from "./game";

const EMOJI: Record<string, string> = {
  goose: "🦢",
  egg: "🥚",
  corn: "🌽",
  bread: "🍞",
  feather: "🪶",
  wheat: "🌾",
};

const board = document.getElementById("board")!;
const rack = document.getElementById("rack")!;
const timerEl = document.getElementById("timer")!;
const banner = document.getElementById("banner")!;
const restartBtn = document.getElementById("restart")!;

let state: GameState = createGame(generateLevel());
let intervalId: number | undefined;

function stacksOf(state: GameState): string[][] {
  const byStack = new Map<string, string[]>();
  for (const tile of state.level.tiles) {
    const stackId = tile.id.split("-")[0];
    if (!byStack.has(stackId)) byStack.set(stackId, []);
    byStack.get(stackId)!.push(tile.id);
  }
  return [...byStack.values()];
}

function renderBoard() {
  board.innerHTML = "";
  for (const stackIds of stacksOf(state)) {
    const stackEl = document.createElement("div");
    stackEl.className = "stack";
    for (const id of stackIds) {
      const tile = state.level.tiles.find((t) => t.id === id)!;
      const depth = Number(id.split("-d")[1]);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "tile";
      el.style.setProperty("--depth", String(depth));
      const onBoard = state.board.has(id);
      if (!onBoard) {
        el.classList.add("gone");
      } else if (isVisible(state, id)) {
        el.classList.add("visible");
        el.textContent = EMOJI[tile.kind];
        el.addEventListener("click", () => {
          state = collect(state, id);
          render();
        });
      } else {
        el.classList.add("covered");
        el.disabled = true;
        el.textContent = EMOJI[tile.kind];
      }
      stackEl.appendChild(el);
    }
    board.appendChild(stackEl);
  }
}

function renderRack() {
  rack.innerHTML = "";
  for (let i = 0; i < state.level.rackCapacity; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    const kind = state.rack[i];
    if (kind) slot.textContent = EMOJI[kind];
    rack.appendChild(slot);
  }
}

function renderTimer() {
  const s = Math.ceil(state.timeRemaining);
  timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function renderBanner() {
  if (state.status === "won") {
    banner.textContent = "Pot's empty --- you win.";
    banner.hidden = false;
  } else if (state.status === "lost") {
    banner.textContent =
      state.timeRemaining === 0 ? "Out of time --- you lose." : "Rack overflowed --- you lose.";
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

function render() {
  renderBoard();
  renderRack();
  renderTimer();
  renderBanner();
  if (state.status !== "playing" && intervalId !== undefined) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
}

function startClock() {
  if (intervalId !== undefined) clearInterval(intervalId);
  intervalId = window.setInterval(() => {
    state = tick(state, 1);
    renderTimer();
    if (state.status !== "playing") render();
  }, 1000);
}

restartBtn.addEventListener("click", () => {
  state = createGame(generateLevel());
  render();
  startClock();
});

render();
startClock();
