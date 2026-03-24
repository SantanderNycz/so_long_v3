export const TILE = 96;
export const ANIM_FRAMES = 4;
export const ENEMY_CYCLE = 420;
export const MOVE_DURATION = 120;

export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "playing" | "won" | "dead" | "idle";

export const CHAR = {
  FLOOR: "0",
  WALL: "1",
  COLLECT: "C",
  PLAYER: "P",
  EXIT: "E",
  ENEMY_R: "R",
  ENEMY_r: "r",
  ENEMY_l: "l",
  ENEMY_L: "L",
  HUNTER: "H",
  OPEN: "O",
} as const;

export interface GameState {
  map: string[];
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  collectLeft: number;
  moves: number;
  status: GameStatus;
  level: number;
  tileSize: number;
  enemyFrame: number;
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
  bg: HTMLImageElement;
  chest: HTMLImageElement;
  chest_o: HTMLImageElement;
  exit: HTMLImageElement;
  player: HTMLImageElement;
  enemy: [
    HTMLImageElement,
    HTMLImageElement,
    HTMLImageElement,
    HTMLImageElement,
  ];
  walls: {
    center: HTMLImageElement;
    t: HTMLImageElement;
    b: HTMLImageElement;
    l: HTMLImageElement;
    r: HTMLImageElement;
    tl: HTMLImageElement;
    tr: HTMLImageElement;
    bl: HTMLImageElement;
    br: HTMLImageElement;
  };
}
