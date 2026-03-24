import { CHAR, MOVE_DURATION, type GameState, type Assets } from "./types";
import { enemyFrameToSprite, getWallVariant } from "./game";

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: Assets,
  now: number,
): void {
  const ts = state.tileSize;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const { width: W, height: H, map, playerX, playerY, moveAnim } = state;

  // Interpolated player position
  let drawPX = playerX,
    drawPY = playerY;
  if (moveAnim) {
    const t = Math.min(1, (now - moveAnim.startTime) / MOVE_DURATION);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    drawPX = moveAnim.fromX + (moveAnim.toX - moveAnim.fromX) * ease;
    drawPY = moveAnim.fromY + (moveAnim.toY - moveAnim.fromY) * ease;
  }

  const enemySprite = enemyFrameToSprite(state.enemyFrame);

  // Draw tiles
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = map[y][x];
      const px = x * ts,
        py = y * ts;

      ctx.drawImage(assets.bg, px, py, ts, ts);

      if (c === CHAR.WALL) {
        const v = getWallVariant(x, y, W, H);
        ctx.drawImage(
          assets.walls[v as keyof typeof assets.walls],
          px,
          py,
          ts,
          ts,
        );
      } else if (c === CHAR.COLLECT) {
        ctx.drawImage(assets.chest, px, py, ts, ts);
      } else if (c === CHAR.OPEN) {
        ctx.drawImage(assets.chest_o, px, py, ts, ts);
      } else if (c === CHAR.EXIT) {
        ctx.drawImage(assets.exit, px, py, ts, ts);
      } else if (c === CHAR.HUNTER) {
        // Hunters: draw enemy with a red tint
        ctx.drawImage(assets.enemy[enemySprite], px, py, ts, ts);
        ctx.fillStyle = "rgba(255,60,60,0.35)";
        ctx.fillRect(px, py, ts, ts);
      } else if (
        c === CHAR.ENEMY_R ||
        c === CHAR.ENEMY_r ||
        c === CHAR.ENEMY_l ||
        c === CHAR.ENEMY_L
      ) {
        ctx.drawImage(assets.enemy[enemySprite], px, py, ts, ts);
      }
    }
  }

  // Player
  ctx.drawImage(assets.player, drawPX * ts, drawPY * ts, ts, ts);

  // HUD
  drawHUD(ctx, state, ts);

  // Overlays
  if (state.status === "won")
    drawOverlay(
      ctx,
      "🏆 Você ganhou, mizerávi!",
      "#22c55e",
      "Enter → próximo nível",
    );
  if (state.status === "dead")
    drawOverlay(
      ctx,
      "💀 Morreu, abestado!",
      "#ef4444",
      "Enter → tentar de novo",
    );
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  ts: number,
): void {
  const pad = 8;
  const left = `Movimentos: ${state.moves}   Coletáveis: ${state.collectLeft}`;
  const right = `${state.level}/10`;

  ctx.save();
  ctx.font = `bold ${Math.max(11, Math.round(ts * 0.17))}px monospace`;

  // Left badge
  const lm = ctx.measureText(left);
  const bh = Math.max(22, Math.round(ts * 0.26));
  drawBadge(ctx, pad, pad, lm.width + pad * 2, bh, "rgba(0,0,0,0.55)");
  ctx.fillStyle = "#ffffff";
  ctx.fillText(left, pad * 2, pad + bh * 0.68);

  // Right level badge
  const rm = ctx.measureText(right);
  const rx = ctx.canvas.width - rm.width - pad * 3;
  drawBadge(ctx, rx, pad, rm.width + pad * 2, bh, "rgba(203,166,247,0.3)");
  ctx.fillStyle = "#e9d8fd";
  ctx.fillText(right, rx + pad, pad + bh * 0.68);

  ctx.restore();
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  text: string,
  color: string,
  hint: string,
): void {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, 0, width, height);

  const fs = Math.max(16, Math.min(28, Math.round(width / 18)));
  ctx.font = `bold ${fs}px monospace`;
  const tm = ctx.measureText(text);
  const cw = tm.width + 48,
    ch = fs * 2.8;
  const cx = (width - cw) / 2,
    cy = (height - ch) / 2 - ch * 0.3;

  ctx.fillStyle = color + "cc";
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 10);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx + 24, cy + ch / 2);

  // Hint text below
  ctx.font = `${Math.round(fs * 0.65)}px monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textBaseline = "top";
  const hm = ctx.measureText(hint);
  ctx.fillText(hint, (width - hm.width) / 2, cy + ch + 10);

  ctx.restore();
}
