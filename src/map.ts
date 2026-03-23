import { CHAR } from './types';

export interface ParsedMap {
  grid: string[];   // grid[y] = row string
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  collectCount: number;
  error?: string;
}

export function parseMap(raw: string): ParsedMap {
  // Normalize line endings, trim trailing whitespace/newlines
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.length > 0);

  if (lines.length === 0) return err('Mapa vazio.');

  const width  = lines[0].length;
  const height = lines.length;

  // All lines same width
  if (!lines.every(l => l.length === width))
    return err('Todas as linhas devem ter o mesmo comprimento.');

  // Valid chars
  const validChars = new Set(['0', '1', 'C', 'P', 'E', 'R', 'r', 'l', 'L']);
  for (const line of lines)
    for (const ch of line)
      if (!validChars.has(ch)) return err(`Caractere inválido: '${ch}'`);

  // Enclosed by walls
  if (!lines[0].split('').every(c => c === '1') ||
      !lines[height - 1].split('').every(c => c === '1'))
    return err('O mapa deve ser fechado por paredes.');
  for (const line of lines)
    if (line[0] !== '1' || line[width - 1] !== '1')
      return err('O mapa deve ser fechado por paredes.');

  // Count required elements
  let playerCount = 0, exitCount = 0, collectCount = 0;
  let playerX = 0, playerY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = lines[y][x];
      if (c === CHAR.PLAYER)   { playerCount++; playerX = x; playerY = y; }
      if (c === CHAR.EXIT)     exitCount++;
      if (c === CHAR.COLLECT)  collectCount++;
    }
  }

  if (playerCount !== 1) return err('O mapa deve ter exatamente um jogador (P).');
  if (exitCount < 1)     return err('O mapa deve ter uma saída (E).');
  if (collectCount < 1)  return err('O mapa deve ter ao menos um coletável (C).');

  // Solvability: flood-fill from P, must reach all C's and E
  if (!isSolvable(lines, width, height, playerX, playerY, collectCount))
    return err('O mapa não pode ser resolvido.');

  return { grid: lines, width, height, playerX, playerY, collectCount };
}

function isSolvable(
  lines: string[], w: number, h: number,
  startX: number, startY: number, collectCount: number
): boolean {
  const visited = Array.from({ length: h }, () => new Array(w).fill(false));
  let toFind = collectCount + 1; // collectibles + exit

  const stack: [number, number][] = [[startX, startY]];
  visited[startY][startX] = true;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const c = lines[y][x];
    if (c === CHAR.COLLECT || c === CHAR.EXIT) toFind--;
    if (toFind === 0) return true;

    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nx = x + dx, ny = y + dy;
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
  return { grid: [], width: 0, height: 0, playerX: 0, playerY: 0, collectCount: 0, error: msg };
}

export const BUILTIN_MAPS: Record<string, string> = {
  'map_42': `1111111111111
10C10000000C1
100001000C001
1P0C01E000001
1111111111111
1101101000111
1101101111011
1110001000011
1111101011111
1111101100011
1111111111111
1111111111111`,

  'map_2': `111111111
1P0000001
100C00001
100000001
100000E01
111111111`,

  'map_3': `11111111111
1P000000001
10C0C0C0C01
100000000E1
11111111111`,

  'small': `11111
1P0E1
10C01
11111`,
};
