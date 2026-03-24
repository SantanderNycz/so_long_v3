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
  enemyCount: number; // número fixo de inimigos
  hunterRatio: number; // fracção de inimigos que perseguem (0..1)
  map: string;
}

export const LEVELS: LevelDef[] = [
  // ── 1 ── Tutorial sem inimigos
  {
    name: "Nível 1",
    subtitle: "Aprende a mover-te",
    enemyCount: 0,
    hunterRatio: 0,
    map: `11111111
1P00C001
100000E1
10000001
11111111`,
  },

  // ── 2 ── Tutorial — porta burocrática (gag: timer 5s)
  {
    name: "Nível 2",
    subtitle: "Recolhe tudo antes de sair",
    enemyCount: 0,
    hunterRatio: 0,
    map: `11111111111
1P000000001
10C000C0001
10001100001
1000000E001
11111111111`,
  },

  // ── 3 ── Primeiros inimigos (aleatórios, fáceis)
  {
    name: "Nível 3",
    subtitle: "Cuidado — há inimigos",
    enemyCount: 2,
    hunterRatio: 0,
    map: `1111111111111
1P00000000001
10C0110000001
10000100C0001
10000100000E1
1000000000001
1111111111111`,
  },

  // ── 4 ── Um inimigo a mais
  {
    name: "Nível 4",
    subtitle: "Mais inimigos, mais armadilhas",
    enemyCount: 3,
    hunterRatio: 0,
    map: `111111111111111
1P0000000000001
10C00110000C001
100001000000001
100001000000E01
100000000000001
100000000000001
111111111111111`,
  },

  // ── 5 ── Documento em falta (gag: C escondido)
  {
    name: "Nível 5",
    subtitle: "Falta qualquer coisa...",
    enemyCount: 3,
    hunterRatio: 0,
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

  // ── 6 ── Primeiro perseguidor
  {
    name: "Nível 6",
    subtitle: "Eles começam a perseguir-te...",
    enemyCount: 3,
    hunterRatio: 0.33,
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

  // ── 7 ── Múltiplas agências (gag: 5 portas, 4 falsas)
  {
    name: "Nível 7",
    subtitle: "Qual será a porta certa?",
    enemyCount: 3,
    hunterRatio: 0.33,
    map: `1111111111111111111
1P00000E00000000001
10C00110000C0000001
10000110000000C0001
1E000000000000C0001
10001100000000E0001
10E00000000C00C0001
10011000000000C0001
10000000000C0000001
1000000000000000E01
1111111111111111111`,
  },

  // ── 8 ── Dois perseguidores
  {
    name: "Nível 8",
    subtitle: "A caçada intensifica-se",
    enemyCount: 4,
    hunterRatio: 0.5,
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

  // ── 9 ── Linha de apoio... ocupada (gag: telefone)
  {
    name: "Nível 9",
    subtitle: "Pede ajuda... se conseguires",
    enemyCount: 4,
    hunterRatio: 0.5,
    map: `111111111111111111111
1P0000000T00000000001
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
111111111111111111111`,
  },

  // ── 10 ── O formulário final (gag: sem inimigos, formulário ao passar)
  {
    name: "Nível 10",
    subtitle: "O fim da jornada... ou será?",
    enemyCount: 0,
    hunterRatio: 0,
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
  return LEVELS[Math.max(0, Math.min(level - 1, LEVELS.length - 1))];
}

export function parseMap(raw: string): ParsedMap {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.length > 0);
  if (!lines.length) return err("Mapa vazio.");

  const width = lines[0].length,
    height = lines.length;

  if (!lines.every((l) => l.length === width))
    return err("Todas as linhas devem ter o mesmo comprimento.");

  const valid = new Set([
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
    "T",
  ]);
  for (const line of lines)
    for (const ch of line)
      if (!valid.has(ch)) return err(`Caractere inválido: '${ch}'`);

  if (
    !lines[0].split("").every((c) => c === "1") ||
    !lines[height - 1].split("").every((c) => c === "1")
  )
    return err("O mapa deve ser fechado por paredes.");
  for (const l of lines)
    if (l[0] !== "1" || l[width - 1] !== "1")
      return err("O mapa deve ser fechado por paredes.");

  let pCount = 0,
    eCount = 0,
    cCount = 0,
    playerX = 0,
    playerY = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const c = lines[y][x];
      if (c === CHAR.PLAYER) {
        pCount++;
        playerX = x;
        playerY = y;
      }
      if (c === CHAR.EXIT) eCount++;
      if (c === CHAR.COLLECT) cCount++;
    }

  if (pCount !== 1) return err("O mapa deve ter exatamente um jogador (P).");
  if (eCount < 1) return err("O mapa deve ter uma saída (E).");
  if (cCount < 1) return err("O mapa deve ter ao menos um coletável (C).");

  if (!isSolvable(lines, width, height, playerX, playerY, cCount, eCount))
    return err("O mapa não pode ser resolvido.");

  return { grid: lines, width, height, playerX, playerY, collectCount: cCount };
}

function isSolvable(
  lines: string[],
  w: number,
  h: number,
  sx: number,
  sy: number,
  cc: number,
  ec: number,
): boolean {
  const vis = Array.from({ length: h }, () => new Array(w).fill(false));
  let toFind = cc + ec;
  const stack: [number, number][] = [[sx, sy]];
  vis[sy][sx] = true;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const c = lines[y][x];
    if (c === CHAR.COLLECT || c === CHAR.EXIT) {
      toFind--;
      if (!toFind) return true;
    }
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nx = x + dx,
        ny = y + dy;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= w ||
        ny >= h ||
        vis[ny][nx] ||
        lines[ny][nx] === CHAR.WALL
      )
        continue;
      vis[ny][nx] = true;
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
