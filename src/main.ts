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

let state: GameState | null = null;
let assets: Assets | null = null;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let lastTime = 0;
let currentLevel = 1;

// ─── Game loop ───────────────────────────────────────────────────────────

function loop(now: number): void {
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;
  if (state && assets) {
    state = tickAnimations(state, now, dt);
    // Mostrar overlay do formulário se necessário
    if (state.status === "form") showForm();
    render(ctx, state, assets, now);
  }
  requestAnimationFrame(loop);
}

// ─── Input ────────────────────────────────────────────────────────────────

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
  if (e.code === "Enter") {
    e.preventDefault();
    if (state.status === "won") advanceLevel();
    else if (state.status === "dead") loadLevel(currentLevel);
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

// ─── Levels ───────────────────────────────────────────────────────────────

function loadLevel(level: number): void {
  currentLevel = Math.max(1, Math.min(level, LEVEL_COUNT));
  const def = getLevelDef(currentLevel);
  const parsed = parseMap(def.map);
  if (parsed.error) {
    console.error(parsed.error);
    return;
  }

  const ts = computeTileSize(parsed.width, parsed.height);
  canvas.width = parsed.width * ts;
  canvas.height = parsed.height * ts;

  state = initGameState(parsed, def, currentLevel, ts);
  updateBanner(def.name, def.subtitle);
  hideForm();
}

function advanceLevel(): void {
  if (currentLevel >= LEVEL_COUNT) {
    showEndScreen();
    return;
  }
  loadLevel(currentLevel + 1);
}

function updateBanner(name: string, sub: string): void {
  const el = document.getElementById("level-banner");
  if (!el) return;
  el.innerHTML = `<span class="lv-name">${name}</span><span class="lv-sub">${sub}</span>`;
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

function onResize(): void {
  if (!state) return;
  const ts = computeTileSize(state.width, state.height);
  canvas.width = state.width * ts;
  canvas.height = state.height * ts;
  state = { ...state, tileSize: ts };
}

// ─── Formulário L10 ───────────────────────────────────────────────────────

function showForm(): void {
  const el = document.getElementById("form-overlay");
  if (el && el.style.display !== "flex") el.style.display = "flex";
}

function hideForm(): void {
  const el = document.getElementById("form-overlay");
  if (el) el.style.display = "none";
  const msg = document.getElementById("form-result");
  if (msg) msg.style.display = "none";
  const form = document.getElementById(
    "bureaucracy-form",
  ) as HTMLFormElement | null;
  if (form) form.style.display = "flex";
}

// ─── End screen ───────────────────────────────────────────────────────────

function showEndScreen(): void {
  const el = document.getElementById("end-overlay");
  if (el) el.style.display = "flex";
}

// ─── Init ────────────────────────────────────────────────────────────────

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

  bindBtn("btn-up", "up");
  bindBtn("btn-down", "down");
  bindBtn("btn-left", "left");
  bindBtn("btn-right", "right");

  document
    .getElementById("restart")!
    .addEventListener("click", () => loadLevel(currentLevel));

  // End screen
  document.getElementById("end-restart")?.addEventListener("click", () => {
    const ov = document.getElementById("end-overlay");
    if (ov) ov.style.display = "none";
    loadLevel(1);
  });

  // Formulário L10 — enviar
  const form = document.getElementById(
    "bureaucracy-form",
  ) as HTMLFormElement | null;
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    form.style.display = "none";
    const res = document.getElementById("form-result");
    if (res) res.style.display = "flex";
    // Após 4s, reinicia do nível 1
    setTimeout(() => {
      hideForm();
      loadLevel(1);
    }, 4500);
  });

  window.addEventListener("resize", onResize);

  loadLevel(1);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", init);
