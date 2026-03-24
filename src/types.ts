export const TILE = 96;
export const MOVE_DURATION = 120;
export const ENEMY_CYCLE = 550; // ms — ligeiramente mais lento = mais jogável

export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "playing" | "won" | "dead" | "idle" | "form";

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
  PHONE: "T",
} as const;

export interface GagState {
  // L2 — porta com timer
  doorTimerMs: number; // -1=não iniciado, >0=contando, 0=aberta
  doorOpen: boolean;
  // L5 — colecionável escondido
  hiddenRevealed: boolean;
  hiddenX: number;
  hiddenY: number;
  // L7 — portas falsas (começa em 4)
  fakeDoorCount: number;
  // Balão de notificação
  notification: string | null;
  notifTileX: number;
  notifTileY: number;
  notifTimer: number; // ms visível
}

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
  gag: GagState;
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
