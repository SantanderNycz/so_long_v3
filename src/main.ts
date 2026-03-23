import { loadAssets } from './assets';
import { parseMap, BUILTIN_MAPS } from './map';
import { initGameState, tryMove, tickAnimations } from './game';
import { render } from './renderer';
import { TILE, type GameState, type Direction, type Assets } from './types';
import './style.css';

// ─── State ──────────────────────────────────────────────────────────────────

let state: GameState | null = null;
let assets: Assets | null = null;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

let lastTime = 0;
let currentMapKey = 'map_42';

// ─── Game loop ───────────────────────────────────────────────────────────────

function loop(now: number): void {
  const dt = now - lastTime;
  lastTime = now;

  if (state && assets) {
    state = tickAnimations(state, now, dt);
    render(ctx, state, assets, now);
  }

  requestAnimationFrame(loop);
}

// ─── Input ───────────────────────────────────────────────────────────────────

const KEY_MAP: Record<string, Direction> = {
  KeyW: 'up', ArrowUp: 'up', Space: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

window.addEventListener('keydown', (e) => {
  if (!state || state.status !== 'playing') {
    if (e.code === 'Enter' || e.code === 'Space') {
      if (state && (state.status === 'won' || state.status === 'dead'))
        loadMap(currentMapKey);
    }
    return;
  }

  const dir = KEY_MAP[e.code];
  if (!dir) return;
  e.preventDefault();

  state = tryMove(state, dir, performance.now());
});

// Mobile d-pad
function bindBtn(id: string, dir: Direction): void {
  const btn = document.getElementById(id);
  if (!btn) return;
  const fire = (e: Event) => {
    e.preventDefault();
    if (state?.status === 'playing')
      state = tryMove(state, dir, performance.now());
  };
  btn.addEventListener('click', fire);
  btn.addEventListener('touchstart', fire, { passive: false });
}

// ─── Map loading ─────────────────────────────────────────────────────────────

function loadMap(key: string): void {
  const raw = BUILTIN_MAPS[key];
  if (!raw) return;
  currentMapKey = key;

  const parsed = parseMap(raw);
  if (parsed.error) {
    showError(parsed.error);
    return;
  }

  // Resize canvas
  canvas.width  = parsed.width  * TILE;
  canvas.height = parsed.height * TILE;

  state = initGameState(parsed);
  document.getElementById('map-error')!.textContent = '';
}

function loadCustomMap(raw: string): void {
  const parsed = parseMap(raw);
  if (parsed.error) {
    showError(parsed.error);
    return;
  }
  currentMapKey = '__custom__';
  BUILTIN_MAPS['__custom__'] = raw;

  canvas.width  = parsed.width  * TILE;
  canvas.height = parsed.height * TILE;

  state = initGameState(parsed);
  document.getElementById('map-error')!.textContent = '';
}

function showError(msg: string): void {
  document.getElementById('map-error')!.textContent = '⚠ ' + msg;
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  canvas = document.getElementById('game') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  // Loading screen
  const loading = document.getElementById('loading')!;
  const ui = document.getElementById('ui')!;

  try {
    assets = await loadAssets('/assets');
  } catch (e) {
    loading.textContent = '❌ Erro ao carregar assets.';
    return;
  }

  loading.style.display = 'none';
  ui.style.display = 'flex';

  // Bind map selector
  const sel = document.getElementById('map-select') as HTMLSelectElement;
  sel.addEventListener('change', () => loadMap(sel.value));

  // Custom map textarea
  const loadBtn = document.getElementById('load-custom')!;
  const textarea = document.getElementById('custom-map') as HTMLTextAreaElement;
  loadBtn.addEventListener('click', () => {
    if (textarea.value.trim()) loadCustomMap(textarea.value.trim());
  });

  // Restart button
  document.getElementById('restart')!.addEventListener('click', () => loadMap(currentMapKey));

  // D-pad
  bindBtn('btn-up', 'up');
  bindBtn('btn-down', 'down');
  bindBtn('btn-left', 'left');
  bindBtn('btn-right', 'right');

  loadMap('map_42');

  lastTime = performance.now();
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);
