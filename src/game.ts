import { CHAR, TILE, ENEMY_CYCLE, type GameState, type Direction, type MoveAnim } from './types';
import type { ParsedMap } from './map';

// Enemy movement state machine (mirrors the C original: R→r→l→L→R)
const ENEMY_NEXT: Record<string, string> = {
  [CHAR.ENEMY_R]: CHAR.ENEMY_r,
  [CHAR.ENEMY_r]: CHAR.ENEMY_l,
  [CHAR.ENEMY_l]: CHAR.ENEMY_L,
  [CHAR.ENEMY_L]: CHAR.ENEMY_R,
};

const DIR_DELTA: Record<string, string> = {
  [CHAR.ENEMY_R]: 'down',
  [CHAR.ENEMY_r]: 'left',
  [CHAR.ENEMY_l]: 'up',
  [CHAR.ENEMY_L]: 'right',
};

export function initGameState(parsed: ParsedMap): GameState {
  // Deep copy the grid rows into a mutable 2D array
  const map = parsed.grid.map(row => row.split('').slice());
  // Place enemies randomly (mirrors add_enemy from C)
  placeEnemies(map, parsed.width, parsed.height);

  return {
    map: map.map(row => row.join('')),
    width: parsed.width,
    height: parsed.height,
    playerX: parsed.playerX,
    playerY: parsed.playerY,
    collectLeft: parsed.collectCount,
    moves: 0,
    status: 'playing',
    enemyFrame: 0,
    enemyFrameTimer: 0,
    moveAnim: null,
  };
}

function placeEnemies(map: string[][], w: number, h: number): void {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (map[y][x] !== CHAR.FLOOR) continue;
      if (Math.random() < 0.15 && canPlaceEnemy(map, x, y, w, h))
        map[y][x] = CHAR.ENEMY_R;
    }
  }
}

function canPlaceEnemy(map: string[][], x: number, y: number, w: number, h: number): boolean {
  // Needs 2x2 free space (matches enemy_can_be_place logic)
  if (x <= 0 || y >= h - 1 || x >= w - 1) return false;
  return (
    map[y][x]     === CHAR.FLOOR &&
    map[y][x-1]   === CHAR.FLOOR &&
    map[y+1][x]   === CHAR.FLOOR &&
    map[y+1][x-1] === CHAR.FLOOR
  );
}

// ─── Player movement ───────────────────────────────────────────────────────

export function tryMove(state: GameState, dir: Direction, now: number): GameState {
  if (state.status !== 'playing') return state;
  if (state.moveAnim !== null) return state; // busy animating

  const { playerX: px, playerY: py } = state;
  const [dx, dy] = dirToDelta(dir);
  const nx = px + dx, ny = py + dy;

  if (ny < 0 || ny >= state.height || nx < 0 || nx >= state.width) return state;

  const map = state.map.slice().map(r => r.split(''));
  const target = map[ny][nx];

  if (target === CHAR.WALL) return state;

  // Enemy = death
  if (isEnemy(target)) {
    return { ...state, status: 'dead' };
  }

  // Start move animation
  const moveAnim: MoveAnim = { fromX: px, fromY: py, toX: nx, toY: ny, startTime: now };

  // Update map
  const prevTile = map[py][px];
  // Restore tile under player (P was standing on floor/open-chest)
  map[py][px] = prevTile === CHAR.PLAYER ? CHAR.FLOOR : prevTile === CHAR.OPEN ? CHAR.OPEN : CHAR.FLOOR;

  let collectLeft = state.collectLeft;
  if (target === CHAR.COLLECT) {
    collectLeft--;
    map[ny][nx] = CHAR.OPEN;
  } else if (target === CHAR.EXIT) {
    map[ny][nx] = CHAR.EXIT; // keep exit tile visible
  } else {
    map[ny][nx] = target;
  }

  // Check win condition (stepped on exit with all collected)
  const newStatus: GameState['status'] =
    target === CHAR.EXIT && collectLeft === 0 ? 'won' : 'playing';

  return {
    ...state,
    map: map.map(r => r.join('')),
    playerX: nx,
    playerY: ny,
    collectLeft,
    moves: state.moves + 1,
    status: newStatus,
    moveAnim,
  };
}

function dirToDelta(dir: Direction): [number, number] {
  if (dir === 'up')    return [0, -1];
  if (dir === 'down')  return [0,  1];
  if (dir === 'left')  return [-1, 0];
  return [1, 0];
}

function isEnemy(c: string): boolean {
  return c === CHAR.ENEMY_R || c === CHAR.ENEMY_r ||
         c === CHAR.ENEMY_l || c === CHAR.ENEMY_L;
}

// ─── Animation tick ────────────────────────────────────────────────────────

export function tickAnimations(state: GameState, now: number, dt: number): GameState {
  if (state.status === 'idle') return state;

  let next = { ...state };

  // Enemy frame cycling (7 frames: 0–6, symmetrical)
  next.enemyFrameTimer += dt;
  if (next.enemyFrameTimer >= ENEMY_CYCLE / 7) {
    next.enemyFrameTimer = 0;
    next.enemyFrame = (next.enemyFrame + 1) % 7;
  }

  // Move enemies every ENEMY_CYCLE ms
  if (next.status === 'playing' && Math.floor(now / ENEMY_CYCLE) > Math.floor((now - dt) / ENEMY_CYCLE)) {
    next = moveEnemies(next);
  }

  // Clear move anim if done
  if (next.moveAnim && now - next.moveAnim.startTime > TILE) {
    next.moveAnim = null;
  }

  return next;
}

function moveEnemies(state: GameState): GameState {
  const map = state.map.slice().map(r => r.split(''));
  let status = state.status;

  const enemies: Array<[number, number, string]> = [];
  for (let y = 0; y < state.height; y++)
    for (let x = 0; x < state.width; x++)
      if (isEnemy(map[y][x])) enemies.push([x, y, map[y][x]]);

  for (const [ex, ey, es] of enemies) {
    if (Math.random() >= 0.6) continue; // 60% chance to move (mirrors original `rand()%5 < 3`)

    const dirName = DIR_DELTA[es];
    const [dx, dy] = dirToDelta(dirName as Direction);
    const nx = ex + dx, ny = ey + dy;

    if (ny < 0 || ny >= state.height || nx < 0 || nx >= state.width) continue;
    const tile = map[ny][nx];
    if (tile === CHAR.WALL || isEnemy(tile)) continue;

    // Check if enemy reaches player
    if (nx === state.playerX && ny === state.playerY) {
      status = 'dead';
      break;
    }

    map[ey][ex] = CHAR.FLOOR;
    map[ny][nx] = ENEMY_NEXT[es] ?? CHAR.ENEMY_R;
  }

  return { ...state, map: map.map(r => r.join('')), status };
}

// ─── Enemy animation frame → sprite index ──────────────────────────────────
// Original: states 0,6→frame0; 1,5→frame1; 2,4→frame2; 3→frame3
export function enemyFrameToSprite(frame: number): number {
  const map = [0, 1, 2, 3, 2, 1, 0];
  return map[frame % 7] ?? 0;
}

// ─── Wall pixel coords ──────────────────────────────────────────────────────
export function getWallVariant(
  x: number, y: number, w: number, h: number
): string {
  const top    = y === 0;
  const bottom = y === h - 1;
  const left   = x === 0;
  const right  = x === w - 1;

  if (top    && left)  return 'tl';
  if (top    && right) return 'tr';
  if (bottom && left)  return 'bl';
  if (bottom && right) return 'br';
  if (top)    return 't';
  if (bottom) return 'b';
  if (left)   return 'l';
  if (right)  return 'r';
  return 'center';
}
