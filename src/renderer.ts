import { TILE, CHAR, MOVE_DURATION, type GameState, type Assets } from './types';
import { enemyFrameToSprite, getWallVariant } from './game';

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: Assets,
  now: number,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const { width: W, height: H, map, playerX, playerY, moveAnim } = state;

  // Compute player draw position (interpolated during move anim)
  let drawPX = playerX, drawPY = playerY;
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
      const px = x * TILE, py = y * TILE;

      // Always draw floor under everything
      ctx.drawImage(assets.bg, px, py, TILE, TILE);

      if (c === CHAR.WALL) {
        const variant = getWallVariant(x, y, W, H);
        ctx.drawImage(assets.walls[variant as keyof typeof assets.walls], px, py, TILE, TILE);
      } else if (c === CHAR.COLLECT) {
        ctx.drawImage(assets.chest, px, py, TILE, TILE);
      } else if (c === CHAR.OPEN) {
        ctx.drawImage(assets.chest_o, px, py, TILE, TILE);
      } else if (c === CHAR.EXIT) {
        ctx.drawImage(assets.exit, px, py, TILE, TILE);
      } else if (c === CHAR.ENEMY_R || c === CHAR.ENEMY_r ||
                 c === CHAR.ENEMY_l || c === CHAR.ENEMY_L) {
        ctx.drawImage(assets.enemy[enemySprite], px, py, TILE, TILE);
      }
    }
  }

  // Draw player (interpolated position)
  ctx.drawImage(assets.player, drawPX * TILE, drawPY * TILE, TILE, TILE);

  // HUD — move counter
  drawHUD(ctx, state);

  // Overlay on win/dead
  if (state.status === 'won')  drawOverlay(ctx, '🏆 Você ganhou, mizerávi!', '#22c55e');
  if (state.status === 'dead') drawOverlay(ctx, '💀 Morreu, abestado!', '#ef4444');
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  const pad = 10;
  const text = `Movimentos: ${state.moves}   Coletáveis: ${state.collectLeft}`;

  ctx.save();
  ctx.font = 'bold 16px monospace';
  const metrics = ctx.measureText(text);
  const bw = metrics.width + pad * 2;
  const bh = 28;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(pad, pad, bw, bh, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, pad * 2, pad + 18);
  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, text: string, color: string): void {
  const { width, height } = ctx.canvas;
  ctx.save();

  // Dim background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, width, height);

  // Card
  ctx.font = 'bold 32px monospace';
  const metrics = ctx.measureText(text);
  const cw = metrics.width + 48, ch = 72;
  const cx = (width - cw) / 2, cy = (height - ch) / 2;

  ctx.fillStyle = color + 'cc';
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 12);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx + 24, cy + ch / 2);
  ctx.restore();
}
