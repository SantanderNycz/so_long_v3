import { CHAR } from "./types";

export interface ParsedMap {
  grid: string[];
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  collectCount: number;
  error?: string;
}

export interface LevelDef {
  name: string;
  subtitle: string;
  hasEnemies: boolean;
  chasing: boolean;
  map: string;
}

export const LEVELS: LevelDef[] = [
  // ── 1 ── Tutorial: siga o caminho
  {
    name: "Nível 1",
    subtitle: "Aprende a mover-te",
    hasEnemies: false,
    chasing: false,
    map: `11111111
1P00C001
100000E1
10000001
11111111`,
  },

  // ── 2 ── Tutorial: primeiro labirinto
  {
    name: "Nível 2",
    subtitle: "Recolhe tudo antes de sair",
    hasEnemies: false,
    chasing: false,
    map: `11111111111
1P000000001
10C000C0001
10001100001
1000000E001
11111111111`,
  },

  // ── 3 ── Primeiros inimigos (aleatórios)
  {
    name: "Nível 3",
    subtitle: "Cuidado — há inimigos",
    hasEnemies: true,
    chasing: false,
    map: `1111111111111
1P00000000001
10C0110000001
10000100C0001
10000100000E1
1000000000001
1111111111111`,
  },

  // ── 4 ── Mais inimigos, mais paredes
  {
    name: "Nível 4",
    subtitle: "Mais inimigos, mais armadilhas",
    hasEnemies: true,
    chasing: false,
    map: `111111111111111
1P0000000000001
10C00110000C001
100001000000001
100001000000E01
100000000000001
100000000000001
111111111111111`,
  },

  // ── 5 ── Inimigos densos, mapa maior
  {
    name: "Nível 5",
    subtitle: "Os inimigos proliferam",
    hasEnemies: true,
    chasing: false,
    map: `11111111111111111
1P000000000000001
10C001100C0000001
1000011000000C001
10000110000000001
1000000000000C001
1000000000C000001
10000000000000E01
11111111111111111`,
  },

  // ── 6 ── Primeiros perseguidores
  {
    name: "Nível 6",
    subtitle: "Eles começam a perseguir-te...",
    hasEnemies: true,
    chasing: true,
    map: `11111111111111111
1P000000000000001
10C001100C0000001
1000011000000C001
10000000000000001
10001100000000001
1000000000C0C0001
10011000000000001
100000000000000E1
11111111111111111`,
  },

  // ── 7 ── Mais perseguidores
  {
    name: "Nível 7",
    subtitle: "Sem sítio para se esconder",
    hasEnemies: true,
    chasing: true,
    map: `1111111111111111111
1P00000000000000001
10C00110000C0000001
10000110000000C0001
10000000000000C0001
10001100000000E0001
10000000000C00C0001
10011000000000C0001
10000000000C0000001
1000000000000000001
1111111111111111111`,
  },

  // ── 8 ── Maioritariamente perseguidores
  {
    name: "Nível 8",
    subtitle: "A caçada intensifica-se",
    hasEnemies: true,
    chasing: true,
    map: `1111111111111111111
1P00000000000000001
10C001100C00000C001
10000110000000C0001
10000000000000C0001
10001100000C000E001
10000110000000C0001
10011000000000C0001
10000000000C0000001
10000110000000C0001
1000000000000000001
1111111111111111111`,
  },

  // ── 9 ── Perseguidores dominam
  {
    name: "Nível 9",
    subtitle: "Eles sabem onde estás",
    hasEnemies: true,
    chasing: true,
    map: `111111111111111111111
1P0000000000000000001
10C00110000C000000001
10000110000000C000001
10000000000C000000001
10001100000000C0C0001
10000110000000000E001
10011000000C000000001
10000000000000C000001
10001100000C000000001
10000000000000C000001
10000000000000C000001
1111111111111111111 1`.replace(
      "1111111111111111111 1",
      "111111111111111111111",
    ),
  },

  // ── 10 ── Fim — perseguidores totais
  {
    name: "Nível 10",
    subtitle: "A sobrevivência final",
    hasEnemies: true,
    chasing: true,
    map: `11111111111111111111111
1P000000000000000000001
10C001100C0000C0000C001
10000110000000C0000C001
10000000000C000000000E1
10001100000000C0C000001
10000110000000000000001
10011000000C0000C000001
10000000000000C0000C001
10001100000C0000000C001
10000110000000C0000C001
10000000000000000000001
10001100000C0000000C001
11111111111111111111111`,
  },
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevelDef(level: number): LevelDef {
  const idx = Math.max(0, Math.min(level - 1, LEVELS.length - 1));
  return LEVELS[idx];
}

export function parseMap(raw: string): ParsedMap {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.length > 0);

  if (lines.length === 0) return err("Mapa vazio.");

  const width = lines[0].length;
  const height = lines.length;

  if (!lines.every((l) => l.length === width))
    return err("Todas as linhas devem ter o mesmo comprimento.");

  const validChars = new Set([
    "0",
    "1",
    "C",
    "P",
    "E",
    "R",
    "r",
    "l",
    "L",
    "H",
  ]);
  for (const line of lines)
    for (const ch of line)
      if (!validChars.has(ch)) return err(`Caractere inválido: '${ch}'`);

  if (
    !lines[0].split("").every((c) => c === "1") ||
    !lines[height - 1].split("").every((c) => c === "1")
  )
    return err("O mapa deve ser fechado por paredes.");
  for (const line of lines)
    if (line[0] !== "1" || line[width - 1] !== "1")
      return err("O mapa deve ser fechado por paredes.");

  let playerCount = 0,
    exitCount = 0,
    collectCount = 0;
  let playerX = 0,
    playerY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = lines[y][x];
      if (c === CHAR.PLAYER) {
        playerCount++;
        playerX = x;
        playerY = y;
      }
      if (c === CHAR.EXIT) exitCount++;
      if (c === CHAR.COLLECT) collectCount++;
    }
  }

  if (playerCount !== 1)
    return err("O mapa deve ter exatamente um jogador (P).");
  if (exitCount < 1) return err("O mapa deve ter uma saída (E).");
  if (collectCount < 1)
    return err("O mapa deve ter ao menos um coletável (C).");

  if (!isSolvable(lines, width, height, playerX, playerY, collectCount))
    return err("O mapa não pode ser resolvido.");

  return { grid: lines, width, height, playerX, playerY, collectCount };
}

function isSolvable(
  lines: string[],
  w: number,
  h: number,
  startX: number,
  startY: number,
  collectCount: number,
): boolean {
  const visited = Array.from({ length: h }, () => new Array(w).fill(false));
  let toFind = collectCount + 1;

  const stack: [number, number][] = [[startX, startY]];
  visited[startY][startX] = true;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const c = lines[y][x];
    if (c === CHAR.COLLECT || c === CHAR.EXIT) toFind--;
    if (toFind === 0) return true;

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
      if (lines[ny][nx] === CHAR.WALL) continue;
      visited[ny][nx] = true;
      stack.push([nx, ny]);
    }
  }
  return toFind === 0;
}

function err(msg: string): ParsedMap {
  return {
    grid: [],
    width: 0,
    height: 0,
    playerX: 0,
    playerY: 0,
    collectCount: 0,
    error: msg,
  };
}
