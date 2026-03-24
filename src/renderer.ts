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

  // Player interpolado
  let drawPX = playerX,
    drawPY = playerY;
  if (moveAnim) {
    const t = Math.min(1, (now - moveAnim.startTime) / MOVE_DURATION);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    drawPX = moveAnim.fromX + (moveAnim.toX - moveAnim.fromX) * ease;
    drawPY = moveAnim.fromY + (moveAnim.toY - moveAnim.fromY) * ease;
  }

  const eSprite = enemyFrameToSprite(state.enemyFrame);

  // Tiles
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = map[y][x];
      const px = x * ts,
        py = y * ts;

      ctx.drawImage(assets.bg, px, py, ts, ts); // chão sempre primeiro

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
      } else if (c === CHAR.PHONE) {
        drawPhone(ctx, px, py, ts);
      } else if (c === CHAR.HUNTER) {
        ctx.drawImage(assets.enemy[eSprite], px, py, ts, ts);
        ctx.fillStyle = "rgba(255,50,50,0.30)";
        ctx.fillRect(px, py, ts, ts);
      } else if (
        c === CHAR.ENEMY_R ||
        c === CHAR.ENEMY_r ||
        c === CHAR.ENEMY_l ||
        c === CHAR.ENEMY_L
      ) {
        ctx.drawImage(assets.enemy[eSprite], px, py, ts, ts);
      }
    }
  }

  // Player
  ctx.drawImage(assets.player, drawPX * ts, drawPY * ts, ts, ts);

  // HUD
  drawHUD(ctx, state, ts);

  // Balão de notificação
  const { gag } = state;
  if (gag.notification && gag.notifTimer > 0) {
    drawBalloon(
      ctx,
      gag.notification,
      gag.notifTileX,
      gag.notifTileY,
      ts,
      W,
      H,
    );
  }
  // L2: balão permanente enquanto timer roda
  if (state.level === 2 && gag.doorTimerMs > 0 && !gag.notification) {
    const dias = Math.ceil(gag.doorTimerMs / 1000);
    drawBalloon(
      ctx,
      `AIMA Fechada.\nEspere ${dias} dia${dias === 1 ? "" : "s"}, por favor`,
      gag.notifTileX,
      gag.notifTileY,
      ts,
      W,
      H,
    );
  }

  // Overlays de fim
  if (state.status === "won")
    drawOverlay(
      ctx,
      "🏆 Você ganhou, mizerávi!",
      "#22c55e",
      "Enter/Toque na tela → próximo nível",
    );
  if (state.status === "dead")
    drawOverlay(
      ctx,
      "💀 Morreu, abestado!",
      "#ef4444",
      "Enter → tentar de novo",
    );
}

// ─── Telefone ───────────────────────────────────────────────────────────────

function drawPhone(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  ts: number,
): void {
  // Fundo azul claro
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(px + ts * 0.1, py + ts * 0.1, ts * 0.8, ts * 0.8);
  // Emoji
  ctx.font = `${ts * 0.55}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📞", px + ts * 0.5, py + ts * 0.52);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// ─── Balão de fala ──────────────────────────────────────────────────────────

function drawBalloon(
  ctx: CanvasRenderingContext2D,
  text: string,
  tx: number,
  ty: number,
  ts: number,
  _mapW: number,
  _mapH: number,
): void {
  const lines = text.split("\n");
  const fs = Math.max(10, Math.min(15, ts * 0.17));
  ctx.font = `bold ${fs}px monospace`;

  const pad = 8;
  const lineH = fs * 1.4;
  const boxW =
    Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const boxH = lines.length * lineH + pad;

  // Posição: acima do tile, centrado, mas clamped ao canvas
  let bx = tx * ts + ts / 2 - boxW / 2;
  let by = ty * ts - boxH - ts * 0.3;

  // Clamp
  const cW = ctx.canvas.width;
  bx = Math.max(4, Math.min(bx, cW - boxW - 4));
  if (by < 4) by = ty * ts + ts + 4; // abaixo se não couber acima

  // Sombra
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 6;

  // Caixa
  ctx.fillStyle = "#fefae0";
  ctx.strokeStyle = "#a08c50";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Triângulo apontado para o tile
  const arrowX = Math.max(bx + 12, Math.min(tx * ts + ts / 2, bx + boxW - 12));
  const arrowY = by + boxH;
  ctx.fillStyle = "#fefae0";
  ctx.strokeStyle = "#a08c50";
  ctx.beginPath();
  ctx.moveTo(arrowX - 6, arrowY);
  ctx.lineTo(arrowX + 6, arrowY);
  ctx.lineTo(arrowX, arrowY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Texto
  ctx.fillStyle = "#2d1f00";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => {
    ctx.fillText(l, bx + pad, by + pad / 2 + i * lineH);
  });
  ctx.textBaseline = "alphabetic";
}

// ─── HUD ────────────────────────────────────────────────────────────────────

function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  ts: number,
): void {
  const pad = 8;
  const fs = Math.max(11, Math.round(ts * 0.17));
  const left = `Movimentos: ${state.moves}   Coletáveis: ${state.collectLeft}`;
  const right = `${state.level}/10`;

  ctx.save();
  ctx.font = `bold ${fs}px monospace`;
  const bh = Math.max(22, Math.round(ts * 0.26));

  const lw = ctx.measureText(left).width + pad * 2;
  drawBadge(ctx, pad, pad, lw, bh, "rgba(0,0,0,0.55)");
  ctx.fillStyle = "#fff";
  ctx.fillText(left, pad * 2, pad + bh * 0.68);

  const rw = ctx.measureText(right).width + pad * 2;
  const rx = ctx.canvas.width - rw - pad;
  drawBadge(ctx, rx, pad, rw, bh, "rgba(203,166,247,0.3)");
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

// ─── Overlay win/dead ────────────────────────────────────────────────────────

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

  const fs = Math.max(14, Math.min(26, Math.round(width / 20)));
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

  ctx.font = `${Math.round(fs * 0.62)}px monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textBaseline = "top";
  const hm = ctx.measureText(hint);
  ctx.fillText(hint, (width - hm.width) / 2, cy + ch + 10);
  ctx.restore();
}
