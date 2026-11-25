// The everyday machinery that makes the engine room feel dense and lived in: pipe bundles with valves and clamps,
// ducts, tanks, control cabinets, louvers, stencilled warnings, ladders, a tool board, a coal pile.

import { add, Bitmap, drawText, fbm, hex, Rng, shade, type RGB } from "./paint.ts";
import { BRONZE, BRONZE_HI, flange, gauge, IRON, patinated, Relief, rivet, STEEL, streak, tube, VERDIGRIS } from "./kit.ts";

export const ENAMEL = hex("#2c4a3e");
export const PAINTED = hex("#3d5a4a");

/** A horizontal bundle of pipes from x0 to x1 starting at y, with wall clamps, flanges, valves and the odd gauge. */
export function pipeRun(b: Bitmap, r: Rng, x0: number, x1: number, y: number, pipes: { d: number; color: RGB; patina?: number }[], opts: { valves?: number; gauges?: number } = {}) {
  let py = y;
  const centers: number[] = [];
  for (const p of pipes) {
    const cy = py + p.d / 2;
    centers.push(cy);
    tube(b, [[x0, cy], [x1, cy]], p.d, patinated(r.int(1, 1e6), p.color, p.patina ?? 0.45, 8), { spec: add(p.color, 110) });
    for (let x = x0 + r.int(20, 90); x < x1 - 10; x += r.int(90, 170)) flange(b, x, cy, p.d, "h", p.color);
    py += p.d + 2;
  }
  // clamps across the bundle back to the wall
  for (let x = x0 + r.int(10, 40); x < x1 - 6; x += r.int(56, 80)) {
    for (let j = y - 2; j < py; j++) {
      b.set(x, j, shade(IRON, 1.25));
      b.set(x + 1, j, shade(IRON, 0.8));
    }
    rivet(b, x, y - 3, add(IRON, 30));
    rivet(b, x, py, add(IRON, 30));
  }
  for (let k = 0; k < (opts.valves ?? 1); k++) {
    const vx = r.int(x0 + 20, x1 - 20);
    const cy = centers[0];
    b.rect(vx - 1, cy - 9, 3, 6, STEEL);
    handwheel(b, vx + 0.5, cy - 11, r.pick([4, 5, 6]), r.chance(0.5) ? hex("#a0302a") : BRONZE);
  }
  for (let k = 0; k < (opts.gauges ?? 0); k++) {
    const gx = r.int(x0 + 20, x1 - 20);
    const cy = centers[centers.length - 1];
    b.rect(gx, cy, 2, 7, STEEL);
    gauge(b, r, gx + 1, cy + 12, r.pick([4, 5]));
  }
  return py;
}

/** A vertical drop of pipe with a flange near each end. */
export function drop(b: Bitmap, r: Rng, x: number, y0: number, y1: number, d: number, color: RGB) {
  tube(b, [[x, y0], [x, y1]], d, patinated(r.int(1, 1e6), color, 0.45, 8), { spec: add(color, 110) });
  flange(b, x, y0 + 6, d, "v", color);
  flange(b, x, y1 - 9, d, "v", color);
}

export function handwheel(b: Bitmap, cx: number, cy: number, rad: number, base: RGB) {
  b.disc(cx, cy, rad, (x, y, d) => {
    const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
    if (d > 0.7 || Math.abs(Math.sin(ang * 2)) < 0.3 || d < 0.25) return shade(base, 0.8 + -Math.sin(ang + Math.PI / 4) * 0.35);
    return null;
  });
}

/** A riveted sheet-metal duct, horizontal. */
export function duct(b: Bitmap, r: Rng, x: number, y: number, w: number, h: number, base: RGB = shade(STEEL, 0.55)) {
  const tex = fbm(r.int(1, 1e6), 7, 2);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const t = j / h;
      let c = shade(base, (t < 0.15 ? 1.25 : t > 0.8 ? 0.62 : 0.95 - t * 0.2) * (0.92 + tex(x + i, y + j) * 0.16));
      if (j === 0) c = add(c, 26);
      if (j === h - 1) c = shade(c, 0.5);
      b.set(x + i, y + j, c);
    }
  for (let i = r.int(20, 40); i < w - 6; i += r.int(46, 64)) {
    for (let j = -2; j < h + 2; j++) {
      b.set(x + i, y + j, shade(base, 1.2));
      b.set(x + i + 1, y + j, shade(base, 1.05));
      b.set(x + i + 2, y + j, shade(base, 0.6));
    }
    for (let j = 1; j < h - 1; j += 5) rivet(b, x + i, y + j, shade(base, 1.4));
  }
  for (let k = 0; k < 3; k++) if (r.chance(0.6)) streak(b, r, x + r.int(4, w - 4), y + h, r.int(6, 18), r.pick(VERDIGRIS));
}

/** A tall tank standing on the floor: domed ends, straps, a gauge glass and a little brass nameplate. */
export function tank(b: Bitmap, r: Rng, x: number, y: number, w: number, h: number, base: RGB) {
  const pat = patinated(r.int(1, 1e6), base, 0.5, 8);
  tube(b, [[x + w / 2, y + w / 2], [x + w / 2, y + h - w / 2]], w, pat, { spec: add(base, 100) });
  for (const sy of [y + Math.round(h * 0.25), y + Math.round(h * 0.7)])
    for (let i = 1; i < w - 1; i++) {
      const t = (i - w / 2) / (w / 2);
      b.set(x + i, sy, shade(BRONZE, 1.15 - Math.abs(t + 0.3) * 0.5));
      b.set(x + i, sy + 1, shade(BRONZE, 0.7 - Math.abs(t) * 0.2));
      if (i % 5 === 2) rivet(b, x + i, sy, shade(BRONZE, 1.3));
    }
  const gx = x + w - 6;
  b.rect(gx, y + h * 0.3, 3, h * 0.35, shade(BRONZE, 0.8));
  for (let j = Math.round(y + h * 0.32); j < y + h * 0.63; j++) b.set(gx + 1, j, j > y + h * 0.48 ? hex("#3f8f98") : hex("#c0d8d8"));
  b.rect(x + 4, y + h * 0.42, 9, 5, shade(BRONZE, 1.1));
  b.rect(x + 4, y + h * 0.42, 9, 1, BRONZE_HI);
}

/** A control cabinet in green enamel: dials, toggles, little lamps and a label plate. */
export function cabinet(b: Bitmap, r: Rng, x: number, y: number, w: number, h: number) {
  const rel = new Relief(x - 1, y - 1, w + 4, h + 4);
  const tex = fbm(r.int(1, 1e6), 5, 2);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const edge = i < 2 || j < 2 || i >= w - 2 || j >= h - 2;
      let c = shade(ENAMEL, 0.9 + tex(x + i, y + j) * 0.18);
      if (r.chance(0.008)) c = shade(IRON, 0.9); // chipped paint
      rel.put(x + i, y + j, edge ? 3 : 2, edge ? shade(ENAMEL, 1.1) : c);
    }
  rel.bake(b);
  // label plate
  b.rect(x + 4, y + 4, Math.min(w - 8, 22), 5, shade(BRONZE, 1.05));
  b.rect(x + 4, y + 4, Math.min(w - 8, 22), 1, BRONZE_HI);
  for (let i = x + 6; i < x + 4 + Math.min(w - 8, 22) - 2; i += 2) b.set(i, y + 6, shade(BRONZE, 0.55));
  // dials
  let gx = x + 9;
  while (gx < x + w - 8) {
    gauge(b, r, gx, y + 17, 4);
    gx += 13;
  }
  // toggles and lamps
  for (let i = x + 6; i < x + w - 5; i += 6) {
    const lampColor = r.pick([hex("#ff5a3a"), hex("#ffc04a"), hex("#5dffa8"), hex("#3a2a24")]);
    if (lampColor[0] + lampColor[1] > 120) b.emit(i, y + 28, lampColor);
    else b.set(i, y + 28, lampColor);
    b.set(i + 1, y + 28, shade(BRONZE, 0.6));
    b.rect(i, y + 33, 2, 3, STEEL);
    b.set(i, r.chance(0.5) ? y + 32 : y + 36, add(STEEL, 40));
  }
  if (h > 46) for (let i = x + 5; i < x + w - 5; i++) for (let j = y + 42; j < y + h - 5; j += 3) b.set(i, j, shade(ENAMEL, 0.55)); // louvers below
}

/** A louvered vent grille. */
export function louver(b: Bitmap, x: number, y: number, w: number, h: number) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
      const slat = (j - 2) % 4;
      b.set(x + i, y + j, edge ? shade(STEEL, 0.75) : slat === 0 ? shade(STEEL, 0.9) : slat === 1 ? shade(STEEL, 0.5) : hex("#0d0f0e"));
    }
}

/** Faded stencilled paint on the wall. */
export function stencil(b: Bitmap, r: Rng, text: string, x: number, y: number, color: RGB = hex("#c8b88a")) {
  drawText(b, text, x, y, () => (r.chance(0.82) ? shade(color, r.range(0.7, 1)) : null));
}

/** An iron ladder. */
export function ladder(b: Bitmap, x: number, y0: number, y1: number) {
  for (let y = y0; y < y1; y++) {
    b.set(x, y, add(IRON, 30));
    b.set(x + 1, y, IRON);
    b.set(x + 9, y, add(IRON, 24));
    b.set(x + 10, y, shade(IRON, 0.7));
    if ((y - y0) % 6 === 3) for (let i = 2; i < 9; i++) b.set(x + i, y, i < 4 ? add(IRON, 26) : IRON);
  }
}

/** A board of wrenches and a hammer on hooks. */
export function toolBoard(b: Bitmap, r: Rng, x: number, y: number) {
  b.rect(x, y, 44, 34, hex("#4a3a28"));
  for (let i = 0; i < 44; i += 4) for (let j = 2; j < 34; j += 4) b.set(x + i + 1, y + j, hex("#2a2016"));
  for (let k = 0; k < 5; k++) {
    const tx = x + 5 + k * 8;
    const len = r.int(16, 26);
    for (let j = 0; j < len; j++) b.set(tx, y + 4 + j, j < 2 ? add(STEEL, 30) : shade(STEEL, 0.9));
    b.rect(tx - 2, y + 4 + len, 5, 3, shade(STEEL, 0.85));
    b.set(tx, y + 5 + len, hex("#1a1a1a"));
  }
}

/** A heap of coal with a shovel in it. */
export function coal(b: Bitmap, r: Rng, x: number, y: number, w: number) {
  for (let i = 0; i < w; i++) {
    const hgt = Math.round(Math.sin((i / w) * Math.PI) * 12 + r.range(0, 2));
    for (let j = 0; j < hgt; j++) b.set(x + i, y - j, r.chance(0.12) ? hex("#5a5a60") : r.chance(0.5) ? hex("#1a1a1e") : hex("#26262c"));
  }
  for (let j = 0; j < 26; j++) b.set(x + w - 10 + j * 0.3, y - 30 + j, hex("#5a4028"));
  b.rect(x + w - 4, y - 6, 6, 4, shade(STEEL, 0.8));
}

