import {
  CHAR,
  TILE,
  ENEMY_CYCLE,
  MOVE_DURATION,
  type GameState,
  type Direction,
  type MoveAnim,
  type GagState,
} from "./types";
import type { ParsedMap, LevelDef } from "./map";

// ─── Estado máquina dos inimigos aleatórios ────────────────────────────────
const ENEMY_NEXT: Record<string, string> = {
  [CHAR.ENEMY_R]: CHAR.ENEMY_r,
  [CHAR.ENEMY_r]: CHAR.ENEMY_l,
  [CHAR.ENEMY_l]: CHAR.ENEMY_L,
  [CHAR.ENEMY_L]: CHAR.ENEMY_R,
};

const DIR_OF_STATE: Record<string, Direction> = {
  [CHAR.ENEMY_R]: "down",
  [CHAR.ENEMY_r]: "left",
  [CHAR.ENEMY_l]: "up",
  [CHAR.ENEMY_L]: "right",
};

// ─── Init ──────────────────────────────────────────────────────────────────

function initGag(level: number, playerX: number, playerY: number): GagState {
  return {
    doorTimerMs: -1,
    doorOpen: false,
    hiddenRevealed: false,
    hiddenX: playerX,
    hiddenY: playerY,
    fakeDoorCount: level === 7 ? 4 : 0,
    notification: null,
    notifTileX: 0,
    notifTileY: 0,
    notifTimer: 0,
  };
}

export function initGameState(
  parsed: ParsedMap,
  def: LevelDef,
  level: number,
  tileSize: number,
): GameState {
  const map2d = parsed.grid.map((r) => r.split(""));

  if (def.enemyCount > 0)
    placeEnemies(
      map2d,
      parsed.width,
      parsed.height,
      def.enemyCount,
      def.hunterRatio,
      parsed.playerX,
      parsed.playerY,
    );

  // L5: an extra hidden collectible (not on the map yet)
  const collectLeft = parsed.collectCount + (level === 5 ? 1 : 0);

  return {
    map: map2d.map((r) => r.join("")),
    width: parsed.width,
    height: parsed.height,
    playerX: parsed.playerX,
    playerY: parsed.playerY,
    collectLeft,
    moves: 0,
    status: "playing",
    level,
    tileSize,
    enemyFrame: 0,
    enemyFrameTimer: 0,
    moveAnim: null,
    gag: initGag(level, parsed.playerX, parsed.playerY),
  };
}

// ─── Fixed-count enemy placement ──────────────────────────────────────────

function placeEnemies(
  map: string[][],
  w: number,
  h: number,
  count: number,
  hunterRatio: number,
  px: number,
  py: number,
): void {
  const candidates: [number, number][] = [];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      if (map[y][x] !== CHAR.FLOOR) continue;
      if (Math.abs(x - px) <= 3 && Math.abs(y - py) <= 3) continue; // safe zone
      candidates.push([x, y]);
    }
  // Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const hunterCount = Math.round(count * hunterRatio);
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    const [x, y] = candidates[i];
    map[y][x] = i < hunterCount ? CHAR.HUNTER : CHAR.ENEMY_R;
  }
}

// ─── Player movement + gag intercepts ────────────────────────────────────

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

  const map = state.map.map((r) => r.split(""));
  const target = map[ny][nx];

  if (target === CHAR.WALL) return state;
  if (isEnemy(target)) return { ...state, status: "dead" };

  // ── Telefone (L9) ────────────────────────────────────────────────────────
  if (target === CHAR.PHONE) {
    return notify(state, "Estamos ocupados,\ntente outro dia...", nx, ny, 3500);
  }

  // ── Intercepts na porta (gags L2, L5, L7, L10) ───────────────────────────
  if (target === CHAR.EXIT) {
    const gagResult = handleExitGag(state, map, nx, ny);
    if (gagResult !== null) return gagResult;
  }

  // ── Movimento normal ──────────────────────────────────────────────────────
  const moveAnim: MoveAnim = {
    fromX: px,
    fromY: py,
    toX: nx,
    toY: ny,
    startTime: now,
  };
  
  map[py][px] = state.map[py][px] === CHAR.EXIT ? CHAR.EXIT : CHAR.FLOOR;

  let collectLeft = state.collectLeft;
  if (target === CHAR.COLLECT) {
    collectLeft--;
    map[ny][nx] = CHAR.OPEN;
  }

  let newStatus: GameState["status"] = "playing";
  if (target === CHAR.EXIT && collectLeft === 0) {
    newStatus = state.level === 10 ? "form" : "won";
  }

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

// ─── Gag: porta ────────────────────────────────────────────────────────────

function handleExitGag(
  state: GameState,
  map: string[][],
  ex: number,
  ey: number,
): GameState | null {
  const { level, collectLeft, gag } = state;

  // L2 — timer burocrático
  if (level === 2 && collectLeft === 0) {
    if (gag.doorOpen) return null; // deixa passar normalmente
    // Iniciar timer se ainda não iniciado
    const timerMs = gag.doorTimerMs <= 0 ? 5000 : gag.doorTimerMs;
    const dias = Math.ceil(timerMs / 1000);
    return {
      ...state,
      gag: {
        ...gag,
        doorTimerMs: timerMs,
        notification: `AIMA Fechada.\nEspere ${dias} dias, por favor`,
        notifTileX: ex,
        notifTileY: ey,
        notifTimer: 2000,
      },
    };
  }

  // L5 — documento em falta
  if (level === 5 && collectLeft === 1 && !gag.hiddenRevealed) {
    const newMap = map.map((r) => [...r]);
    newMap[gag.hiddenY][gag.hiddenX] = CHAR.COLLECT;
    return {
      ...state,
      map: newMap.map((r) => r.join("")),
      gag: {
        ...gag,
        hiddenRevealed: true,
        notification: "Falta um documento...\nvolte outro dia",
        notifTileX: ex,
        notifTileY: ey,
        notifTimer: 3500,
      },
    };
  }

  // L7 — porta falsa
  if (level === 7 && gag.fakeDoorCount > 0) {
    const newMap = map.map((r) => [...r]);
    newMap[ey][ex] = CHAR.FLOOR; // porta some
    return {
      ...state,
      map: newMap.map((r) => r.join("")),
      gag: {
        ...gag,
        fakeDoorCount: gag.fakeDoorCount - 1,
        notification: "Dirija-se\npara outra agência",
        notifTileX: ex,
        notifTileY: ey,
        notifTimer: 3000,
      },
    };
  }

  return null; // sem intercept
}

// ─── Animation tick ────────────────────────────────────────────────────────

export function tickAnimations(
  state: GameState,
  now: number,
  dt: number,
): GameState {
  if (state.status === "idle") return state;

  let s = { ...state, gag: { ...state.gag } };

  // Quadros do inimigo
  s.enemyFrameTimer += dt;
  if (s.enemyFrameTimer >= ENEMY_CYCLE / 7) {
    s.enemyFrameTimer = 0;
    s.enemyFrame = (s.enemyFrame + 1) % 7;
  }

  // Mover inimigos
  if (
    s.status === "playing" &&
    Math.floor(now / ENEMY_CYCLE) > Math.floor((now - dt) / ENEMY_CYCLE)
  ) {
    s = moveEnemies(s);
  }

  // Limpar anim de movimento
  if (s.moveAnim && now - s.moveAnim.startTime > MOVE_DURATION)
    s.moveAnim = null;

  // Timer da notificação
  if (s.gag.notifTimer > 0) {
    s.gag.notifTimer = Math.max(0, s.gag.notifTimer - dt);
    if (s.gag.notifTimer === 0) s.gag.notification = null;
  }

  // Timer da porta L2
  if (s.gag.doorTimerMs > 0) {
    s.gag.doorTimerMs = Math.max(0, s.gag.doorTimerMs - dt);
    const dias = Math.ceil(s.gag.doorTimerMs / 1000);
    // Atualizar texto do balão enquanto corre
    if (s.gag.doorTimerMs > 0) {
      s.gag.notification = `AIMA Fechada.\nEspere ${dias} dia${dias === 1 ? "" : "s"}, por favor`;
      s.gag.notifTimer = 2000; // keep visible
    } else {
      // Timer chegou a 0 — porta abre
      s.gag.doorOpen = true;
      s.gag.notification = "✅ AIMA aberta!\nPode entrar.";
      s.gag.notifTileX = s.gag.notifTileX; // keep position
      s.gag.notifTimer = 2500;
    }
  }

  return s;
}

// ─── Mover inimigos ────────────────────────────────────────────────────────

function moveEnemies(state: GameState): GameState {
  const map = state.map.map((r) => r.split(""));
  let status = state.status;

  const enemies: [number, number, string][] = [];
  for (let y = 0; y < state.height; y++)
    for (let x = 0; x < state.width; x++)
      if (isEnemy(map[y][x])) enemies.push([x, y, map[y][x]]);

  for (const [ex, ey, es] of enemies) {
    if (status === "dead") break;

    // ── Hunter: BFS ──────────────────────────────────────────────────────
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
      if (
        map[ny][nx] !== CHAR.FLOOR &&
        map[ny][nx] !== CHAR.OPEN &&
        !(nx === state.playerX && ny === state.playerY)
      )
        continue;
      if (nx === state.playerX && ny === state.playerY) {
        status = "dead";
        continue;
      }
      map[ey][ex] = CHAR.FLOOR;
      map[ny][nx] = CHAR.HUNTER;
      continue;
    }

    // ── Random: máquina de estados (60% chance de mover) ─────────────────
    if (Math.random() >= 0.6) continue;
    const dir = DIR_OF_STATE[es];
    if (!dir) continue;
    const [ddx, ddy] = dirToDelta(dir);
    const nx = ex + ddx,
      ny = ey + ddy;
    if (ny < 0 || ny >= state.height || nx < 0 || nx >= state.width) continue;
    const tile = map[ny][nx];
    if (
      tile === CHAR.WALL ||
      isEnemy(tile) ||
      tile === CHAR.EXIT ||
      tile === CHAR.COLLECT
    )
      continue;
    if (nx === state.playerX && ny === state.playerY) {
      status = "dead";
      continue;
    }
    map[ey][ex] = CHAR.FLOOR;
    map[ny][nx] = ENEMY_NEXT[es] ?? CHAR.ENEMY_R;
  }

  return { ...state, map: map.map((r) => r.join("")), status };
}

// ─── BFS: primeiro passo do caminho de (fx,fy) até (tx,ty) ───────────────

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
  type Prev = [number, number] | null;
  const vis = Array.from({ length: h }, () => new Uint8Array(w));
  const prev: Prev[][] = Array.from({ length: h }, () =>
    new Array(w).fill(null),
  );
  const q: [number, number][] = [[fx, fy]];
  vis[fy][fx] = 1;

  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === tx && y === ty) {
      // Voltar até encontrar o passo a partir de (fx,fy)
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
    ] as const) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || vis[ny][nx]) continue;
      const t = map[ny][nx];
      if (
        t === CHAR.WALL ||
        isEnemy(t) ||
        t === CHAR.EXIT ||
        t === CHAR.COLLECT
      )
        continue;
      vis[ny][nx] = 1;
      prev[ny][nx] = [x, y];
      q.push([nx, ny]);
    }
  }
  return null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function isEnemy(c: string): boolean {
  return (
    c === CHAR.ENEMY_R ||
    c === CHAR.ENEMY_r ||
    c === CHAR.ENEMY_l ||
    c === CHAR.ENEMY_L ||
    c === CHAR.HUNTER
  );
}

function dirToDelta(dir: Direction): [number, number] {
  if (dir === "up") return [0, -1];
  if (dir === "down") return [0, 1];
  if (dir === "left") return [-1, 0];
  return [1, 0];
}

function notify(
  state: GameState,
  msg: string,
  tx: number,
  ty: number,
  ms: number,
): GameState {
  return {
    ...state,
    gag: {
      ...state.gag,
      notification: msg,
      notifTileX: tx,
      notifTileY: ty,
      notifTimer: ms,
    },
  };
}

export function enemyFrameToSprite(frame: number): number {
  return ([0, 1, 2, 3, 2, 1, 0] as const)[frame % 7] ?? 0;
}

export function getWallVariant(
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const t = y === 0,
    b = y === h - 1,
    l = x === 0,
    r = x === w - 1;
  if (t && l) return "tl";
  if (t && r) return "tr";
  if (b && l) return "bl";
  if (b && r) return "br";
  if (t) return "t";
  if (b) return "b";
  if (l) return "l";
  if (r) return "r";
  return "center";
}

export function computeTileSize(mapW: number, mapH: number): number {
  const maxW = Math.floor((window.innerWidth - 32) / mapW);
  const maxH = Math.floor((window.innerHeight - 280) / mapH);
  return Math.max(16, Math.min(maxW, maxH, TILE));
}
