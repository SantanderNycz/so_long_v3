import { loadAssets } from "./assets";
import { parseMap, getLevelDef, LEVEL_COUNT } from "./map";
import {
  initGameState,
  tryMove,
  tickAnimations,
  computeTileSize,
} from "./game";
import { render } from "./renderer";
import { type GameState, type Direction, type Assets } from "./types";
import "./style.css";

// ─── State ──────────────────────────────────────────────────────────────────

let state: GameState | null = null;
let assets: Assets | null = null;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let lastTime = 0;
let currentLevel = 1;

// ─── Game loop ────────────────────────────────────────────────────────────

function loop(now: number): void {
  const dt = Math.min(now - lastTime, 100); // cap dt to avoid spiral on tab switch
  lastTime = now;

  if (state && assets) {
    state = tickAnimations(state, now, dt);
    render(ctx, state, assets, now);
  }

  requestAnimationFrame(loop);
}

// ─── Input ───────────────────────────────────────────────────────────────

const KEY_MAP: Record<string, Direction> = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

window.addEventListener("keydown", (e) => {
  if (!state) return;

  if (e.code === "Enter" || e.code === "Space") {
    e.preventDefault();
    if (state.status === "won") {
      advanceLevel();
    } else if (state.status === "dead") {
      loadLevel(currentLevel);
    }
    return;
  }

  if (state.status !== "playing") return;

  const dir = KEY_MAP[e.code];
  if (!dir) return;
  e.preventDefault();
  state = tryMove(state, dir, performance.now());
});

function bindBtn(id: string, dir: Direction): void {
  const btn = document.getElementById(id);
  if (!btn) return;
  const fire = (e: Event) => {
    e.preventDefault();
    if (state?.status === "playing")
      state = tryMove(state, dir, performance.now());
  };
  btn.addEventListener("click", fire);
  btn.addEventListener("touchstart", fire, { passive: false });
}

// ─── Level management ─────────────────────────────────────────────────────

function loadLevel(level: number): void {
  currentLevel = Math.max(1, Math.min(level, LEVEL_COUNT));
  const def = getLevelDef(currentLevel);
  const parsed = parseMap(def.map);

  if (parsed.error) {
    console.error(`Level ${currentLevel} error:`, parsed.error);
    return;
  }

  const ts = computeTileSize(parsed.width, parsed.height);
  canvas.width = parsed.width * ts;
  canvas.height = parsed.height * ts;

  state = initGameState(parsed, def, currentLevel, ts);
  updateLevelBanner(def.name, def.subtitle);
}

function advanceLevel(): void {
  if (currentLevel >= LEVEL_COUNT) {
    showEndScreen();
    return;
  }
  loadLevel(currentLevel + 1);
}

function updateLevelBanner(name: string, subtitle: string): void {
  const el = document.getElementById("level-banner");
  if (!el) return;
  el.innerHTML = `<span class="lv-name">${name}</span><span class="lv-sub">${subtitle}</span>`;

  // Flash animation
  el.classList.remove("flash");
  void el.offsetWidth; // reflow
  el.classList.add("flash");
}

function showEndScreen(): void {
  const overlay = document.getElementById("end-overlay");
  if (overlay) overlay.style.display = "flex";
}

// ─── Window resize ─────────────────────────────────────────────────────────

function onResize(): void {
  if (!state) return;
  const ts = computeTileSize(state.width, state.height);
  canvas.width = state.width * ts;
  canvas.height = state.height * ts;
  state = { ...state, tileSize: ts };
}

// ─── Bootstrap ───────────────────────────────────────────────────────────

async function init(): Promise<void> {
  canvas = document.getElementById("game") as HTMLCanvasElement;
  ctx = canvas.getContext("2d")!;

  const loading = document.getElementById("loading")!;
  const ui = document.getElementById("ui")!;

  try {
    assets = await loadAssets("/assets");
  } catch {
    loading.textContent = "❌ Erro ao carregar assets.";
    return;
  }

  loading.style.display = "none";
  ui.style.display = "flex";

  // D-pad
  bindBtn("btn-up", "up");
  bindBtn("btn-down", "down");
  bindBtn("btn-left", "left");
  bindBtn("btn-right", "right");

  // Restart current level
  document
    .getElementById("restart")!
    .addEventListener("click", () => loadLevel(currentLevel));

  // End screen restart
  const endBtn = document.getElementById("end-restart");
  if (endBtn)
    endBtn.addEventListener("click", () => {
      const ov = document.getElementById("end-overlay");
      if (ov) ov.style.display = "none";
      loadLevel(1);
    });

  window.addEventListener("resize", onResize);

  loadLevel(1);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", init);
