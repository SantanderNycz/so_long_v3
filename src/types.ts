export const TILE = 96;
export const ANIM_FRAMES = 4;      // enemy frames
export const ENEMY_CYCLE = 420;    // ms per enemy move cycle
export const MOVE_DURATION = 120;  // ms for player slide animation

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GameStatus = 'playing' | 'won' | 'dead' | 'idle';

// Map chars (matching original)
export const CHAR = {
  FLOOR:   '0',
  WALL:    '1',
  COLLECT: 'C',
  PLAYER:  'P',
  EXIT:    'E',
  ENEMY_R: 'R',   // moving down
  ENEMY_r: 'r',   // moving left
  ENEMY_l: 'l',   // moving up
  ENEMY_L: 'L',   // moving right
  OPEN:    'O',   // opened chest
} as const;

export interface GameState {
  map: string[];          // 2D array: map[y][x]
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  collectLeft: number;
  moves: number;
  status: GameStatus;
  // animation state
  enemyFrame: number;     // 0-6
  enemyFrameTimer: number;
  moveAnim: MoveAnim | null;
}

export interface MoveAnim {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
}

export interface Assets {
  bg:       HTMLImageElement;
  chest:    HTMLImageElement;
  chest_o:  HTMLImageElement;
  exit:     HTMLImageElement;
  player:   HTMLImageElement;
  enemy:    [HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement];
  walls: {
    center: HTMLImageElement;
    t: HTMLImageElement; b: HTMLImageElement;
    l: HTMLImageElement; r: HTMLImageElement;
    tl: HTMLImageElement; tr: HTMLImageElement;
    bl: HTMLImageElement; br: HTMLImageElement;
  };
}
