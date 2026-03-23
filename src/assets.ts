import type { Assets } from './types';

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export async function loadAssets(base: string = '/assets'): Promise<Assets> {
  const [
    bg, chest, chest_o, exit_, player,
    e0, e1, e2, e3,
    wall, wall_t, wall_b, wall_l, wall_r,
    wall_tl, wall_tr, wall_bl, wall_br,
  ] = await Promise.all([
    loadImg(`${base}/bg.png`),
    loadImg(`${base}/chest.png`),
    loadImg(`${base}/chest_o.png`),
    loadImg(`${base}/exit.png`),
    loadImg(`${base}/player.png`),
    loadImg(`${base}/enemy_0.png`),
    loadImg(`${base}/enemy_1.png`),
    loadImg(`${base}/enemy_2.png`),
    loadImg(`${base}/enemy_3.png`),
    loadImg(`${base}/wall.png`),
    loadImg(`${base}/wall_t.png`),
    loadImg(`${base}/wall_b.png`),
    loadImg(`${base}/wall_l.png`),
    loadImg(`${base}/wall_r.png`),
    loadImg(`${base}/wall_tl.png`),
    loadImg(`${base}/wall_tr.png`),
    loadImg(`${base}/wall_bl.png`),
    loadImg(`${base}/wall_br.png`),
  ]);

  return {
    bg,
    chest,
    chest_o,
    exit: exit_,
    player,
    enemy: [e0, e1, e2, e3],
    walls: {
      center: wall,
      t: wall_t, b: wall_b, l: wall_l, r: wall_r,
      tl: wall_tl, tr: wall_tr, bl: wall_bl, br: wall_br,
    },
  };
}
