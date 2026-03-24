import {
  CHAR,
  TILE,
  ENEMY_CYCLE,
  MOVE_DURATION,
  type GameState,
  type Direction,
  type MoveAnim,
} from "./types";
import type { ParsedMap, LevelDef } from "./map";

const ENEMY_NEXT: Record<string, string> = {
  [CHAR.ENEMY_R]: CHAR.ENEMY_r,
  [CHAR.ENEMY_r]: CHAR.ENEMY_l,
  [CHAR.ENEMY_l]: CHAR.ENEMY_L,
  [CHAR.ENEMY_L]: CHAR.ENEMY_R,
};

// ─── Enemy density & hunter ratio per level ───────────────────────────────
const DENSITY = [0, 0, 0, 0.08, 0.12, 0.15, 0.16, 0.18, 0.2, 0.22, 0.24];
const HUNT_RATIO = [0, 0, 0, 0, 0, 0, 0.25, 0.45, 0.65, 0.8, 1.0];
// Probability of random enemy to move erratically (skip state machine)
const ERRATIC = [0, 0, 0, 0, 0.05, 0.12, 0.2, 0.3, 0.4, 0.5, 0.5];

export function initGameState(
  parsed: ParsedMap,
  def: LevelDef,
  level: number,
  tileSize: number,
): GameState {
  const map = parsed.grid.map((row) => row.split("").slice());

  if (def.hasEnemies)
    placeEnemies(
      map,
      parsed.width,
      parsed.height,
      level,
      parsed.playerX,
      parsed.playerY,
    );

  return {
    map: map.map((row) => row.join("")),
    width: parsed.width,
    height: parsed.height,
    playerX: parsed.playerX,
    playerY: parsed.playerY,
    collectLeft: parsed.collectCount,
    moves: 0,
    status: "playing",
    level,
    tileSize,
    enemyFrame: 0,
    enemyFrameTimer: 0,
    moveAnim: null,
  };
}

function placeEnemies(
  map: string[][],
  w: number,
  h: number,
  level: number,
  playerX: number,
  playerY: number,
): void {
  const density = DENSITY[level] ?? 0.24;
  const huntRatio = HUNT_RATIO[level] ?? 1.0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (map[y][x] !== CHAR.FLOOR) continue;
      // Safety radius around player start
      if (Math.abs(x - playerX) <= 3 && Math.abs(y - playerY) <= 3) continue;
      if (Math.random() >= density) continue;
      if (!canPlaceEnemy(map, x, y, w, h)) continue;
      map[y][x] = Math.random() < huntRatio ? CHAR.HUNTER : CHAR.ENEMY_R;
    }
  }
}

function canPlaceEnemy(
  map: string[][],
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (x <= 0 || y >= h - 1 || x >= w - 1) return false;
  return (
    map[y][x] === CHAR.FLOOR &&
    map[y][x - 1] === CHAR.FLOOR &&
    map[y + 1][x] === CHAR.FLOOR &&
    map[y + 1][x - 1] === CHAR.FLOOR
  );
}

// ─── Player movement ───────────────────────────────────────────────────────

export function tryMove(
  state: GameState,
  dir: Direction,
  now: number,
): GameState {
  if (state.status !== "playing") return state;
  if (state.moveAnim !== null) return state;

  const { playerX: px, playerY: py } = state;
  const [dx, dy] = dirToDelta(dir);
  const nx = px + dx,
    ny = py + dy;

  if (ny < 0 || ny >= state.height || nx < 0 || nx >= state.width) return state;

  const map = state.map.slice().map((r) => r.split(""));
  const target = map[ny][nx];

  if (target === CHAR.WALL) return state;
  if (isEnemy(target)) return { ...state, status: "dead" };

  const moveAnim: MoveAnim = {
    fromX: px,
    fromY: py,
    toX: nx,
    toY: ny,
    startTime: now,
  };

  map[py][px] = CHAR.FLOOR;

  let collectLeft = state.collectLeft;
  if (target === CHAR.COLLECT) {
    collectLeft--;
    map[ny][nx] = CHAR.OPEN;
  }

  const newStatus: GameState["status"] =
    target === CHAR.EXIT && collectLeft === 0 ? "won" : "playing";

  return {
    ...state,
    map: map.map((r) => r.join("")),
    playerX: nx,
    playerY: ny,
    collectLeft,
    moves: state.moves + 1,
    status: newStatus,
    moveAnim,
  };
}

function dirToDelta(dir: Direction): [number, number] {
  if (dir === "up") return [0, -1];
  if (dir === "down") return [0, 1];
  if (dir === "left") return [-1, 0];
  return [1, 0];
}

export function isEnemy(c: string): boolean {
  return (
    c === CHAR.ENEMY_R ||
    c === CHAR.ENEMY_r ||
    c === CHAR.ENEMY_l ||
    c === CHAR.ENEMY_L ||
    c === CHAR.HUNTER
  );
}

// ─── Animation tick ────────────────────────────────────────────────────────

export function tickAnimations(
  state: GameState,
  now: number,
  dt: number,
): GameState {
  if (state.status === "idle") return state;

  let next = { ...state };

  // Enemy frame
  next.enemyFrameTimer += dt;
  if (next.enemyFrameTimer >= ENEMY_CYCLE / 7) {
    next.enemyFrameTimer = 0;
    next.enemyFrame = (next.enemyFrame + 1) % 7;
  }

  // Move enemies every cycle
  if (
    next.status === "playing" &&
    Math.floor(now / ENEMY_CYCLE) > Math.floor((now - dt) / ENEMY_CYCLE)
  ) {
    next = moveEnemies(next);
  }

  // Clear move anim
  if (next.moveAnim && now - next.moveAnim.startTime > MOVE_DURATION) {
    next.moveAnim = null;
  }

  return next;
}

function moveEnemies(state: GameState): GameState {
  const map = state.map.slice().map((r) => r.split(""));
  let status = state.status;

  const erratic = ERRATIC[state.level] ?? 0.5;

  // Collect enemies first so we don't double-move
  const enemies: Array<[number, number, string]> = [];
  for (let y = 0; y < state.height; y++)
    for (let x = 0; x < state.width; x++)
      if (isEnemy(map[y][x])) enemies.push([x, y, map[y][x]]);

  for (const [ex, ey, es] of enemies) {
    if (status === "dead") break;

    // ── Hunter: BFS toward player ──────────────────────────────────────────
    if (es === CHAR.HUNTER) {
      const step = bfsStep(
        map,
        state.width,
        state.height,
        ex,
        ey,
        state.playerX,
        state.playerY,
      );
      if (!step) continue;
      const [nx, ny] = step;
      if (nx === state.playerX && ny === state.playerY) {
        status = "dead";
        continue;
      }
      map[ey][ex] = CHAR.FLOOR;
      map[ny][nx] = CHAR.HUNTER;
      continue;
    }

    // ── Random enemy: state machine (60% move chance) ─────────────────────
    if (Math.random() >= 0.6) continue;

    let dirName: string;
    if (Math.random() < erratic) {
      // Pick a random free adjacent cell
      const dirs = ["up", "down", "left", "right"];
      const shuffled = dirs.sort(() => Math.random() - 0.5);
      const picked = shuffled.find((d) => {
        const [ddx, ddy] = dirToDelta(d as Direction);
        const nx = ex + ddx,
          ny = ey + ddy;
        return (
          ny >= 0 &&
          ny < state.height &&
          nx >= 0 &&
          nx < state.width &&
          map[ny][nx] !== CHAR.WALL &&
          !isEnemy(map[ny][nx])
        );
      });
      if (!picked) continue;
      dirName = picked;
    } else {
      dirName = stateToDir(es);
    }

    const [ddx, ddy] = dirToDelta(dirName as Direction);
    const nx = ex + ddx,
      ny = ey + ddy;

    if (ny < 0 || ny >= state.height || nx < 0 || nx >= state.width) continue;
    const tile = map[ny][nx];
    if (tile === CHAR.WALL || isEnemy(tile)) continue;

    if (nx === state.playerX && ny === state.playerY) {
      status = "dead";
      continue;
    }

    map[ey][ex] = CHAR.FLOOR;
    map[ny][nx] = ENEMY_NEXT[es] ?? CHAR.ENEMY_R;
  }

  return { ...state, map: map.map((r) => r.join("")), status };
}

function stateToDir(es: string): string {
  if (es === CHAR.ENEMY_R) return "down";
  if (es === CHAR.ENEMY_r) return "left";
  if (es === CHAR.ENEMY_l) return "up";
  return "right"; // ENEMY_L
}

// ─── BFS: returns first step [nx, ny] from (fx,fy) toward (tx,ty) ─────────

function bfsStep(
  map: string[][],
  w: number,
  h: number,
  fx: number,
  fy: number,
  tx: number,
  ty: number,
): [number, number] | null {
  if (fx === tx && fy === ty) return null;

  const visited = Array.from({ length: h }, () => new Uint8Array(w));
  // prev[ny][nx] = [px, py] of the cell we came from
  const prev: ([number, number] | null)[][] = Array.from({ length: h }, () =>
    new Array(w).fill(null),
  );

  const queue: [number, number][] = [[fx, fy]];
  visited[fy][fx] = 1;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;

    if (x === tx && y === ty) {
      // Trace back to find the first step
      let cx = tx,
        cy = ty;
      while (true) {
        const p = prev[cy][cx];
        if (!p) break;
        const [ppx, ppy] = p;
        if (ppx === fx && ppy === fy) return [cx, cy];
        cx = ppx;
        cy = ppy;
      }
      return null;
    }

    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (visited[ny][nx]) continue;
      const t = map[ny][nx];
      // Hunters can walk through other hunters to reach player,
      // but NOT through walls or random enemies
      if (t === CHAR.WALL) continue;
      if (
        t === CHAR.ENEMY_R ||
        t === CHAR.ENEMY_r ||
        t === CHAR.ENEMY_l ||
        t === CHAR.ENEMY_L
      )
        continue;
      visited[ny][nx] = 1;
      prev[ny][nx] = [x, y];
      queue.push([nx, ny]);
    }
  }
  return null;
}

// ─── Enemy animation ───────────────────────────────────────────────────────

export function enemyFrameToSprite(frame: number): number {
  return [0, 1, 2, 3, 2, 1, 0][frame % 7] ?? 0;
}

// ─── Wall variant ──────────────────────────────────────────────────────────

export function getWallVariant(
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const top = y === 0,
    bottom = y === h - 1;
  const left = x === 0,
    right = x === w - 1;
  if (top && left) return "tl";
  if (top && right) return "tr";
  if (bottom && left) return "bl";
  if (bottom && right) return "br";
  if (top) return "t";
  if (bottom) return "b";
  if (left) return "l";
  if (right) return "r";
  return "center";
}

// ─── Tile size: fit map into visible viewport ──────────────────────────────

export function computeTileSize(mapW: number, mapH: number): number {
  const UI_CHROME = 160; // px reserved for controls above/below canvas
  const PADDING = 32;
  const maxW = Math.floor((window.innerWidth - PADDING) / mapW);
  const maxH = Math.floor((window.innerHeight - UI_CHROME) / mapH);
  return Math.max(16, Math.min(maxW, maxH, TILE)); // clamp 16..96
}
