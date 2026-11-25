// Moving parts other than gears: the engine's crank and connecting rod, the governor, the clock's anchor and
// pendulum, gauge needles, the steam valve lever, the furnace fire, the status lamps and the maintenance automaton.
// Each returns a horizontal strip of frames plus where its first frame sits in the layer.

import { add, Bitmap, bayer, hex, shade, type RGB } from "./paint.ts";
import { BRONZE, BRONZE_HI, BRONZE_LO, finish, IRON, needle, STEEL, tube } from "./kit.ts";
import { AMBIENT, ANCHOR, CRANK, FLYWHEEL, FURNACE, GAUGES, GOVERNOR, LEVELS, LEVER, midLights, PENDULUM } from "./layout.ts";

export interface Strip {
  strip: Bitmap;
  frames: number;
  fw: number;
  fh: number;
  x: number;
  y: number;
}

/** A box around (x0..x1, y0..y1) whose top-left sits on the 4px dither grid. */
function box(x0: number, y0: number, x1: number, y1: number) {
  const x = Math.floor(x0 / 4) * 4;
  const y = Math.floor(y0 / 4) * 4;
  return { x, y, w: Math.ceil(x1) - x, h: Math.ceil(y1) - y };
}

/** Paint `frames` frames with `paint(frame, k)` (in layer coordinates), light them like the mid layer. */
function strip(bx: ReturnType<typeof box>, frames: number, paint: (b: Bitmap, k: number) => void, lit = true): Strip {
  const out = new Bitmap(bx.w * frames, bx.h);
  for (let k = 0; k < frames; k++) {
    const big = new OffsetBitmap(bx.w, bx.h, bx.x, bx.y);
    paint(big, k);
    if (lit) finish(big, midLights(), AMBIENT.mid, LEVELS, bx.x, bx.y);
    out.blit(big, k * bx.w, 0);
  }
  return { strip: out, frames, fw: bx.w, fh: bx.h, x: bx.x, y: bx.y };
}

/** A bitmap you paint in layer coordinates; it only keeps the part inside its box. */
class OffsetBitmap extends Bitmap {
  readonly ox: number;
  readonly oy: number;
  constructor(w: number, h: number, ox: number, oy: number) {
    super(w, h);
    this.ox = ox;
    this.oy = oy;
  }
  set(x: number, y: number, c: RGB, a = 1) {
    super.set(x - this.ox, y - this.oy, c, a);
  }
  emit(x: number, y: number, c: RGB) {
    this.set(x, y, c); // (Bitmap.emit would call set with already-shifted coordinates)
    const lx = Math.floor(x) - this.ox;
    const ly = Math.floor(y) - this.oy;
    if (lx >= 0 && ly >= 0 && lx < this.w && ly < this.h) this.glow[ly * this.w + lx] = 1;
  }
  tint(x: number, y: number, f: RGB | number) {
    super.tint(x - this.ox, y - this.oy, f);
  }
  painted(x: number, y: number) {
    return super.painted(x - this.ox, y - this.oy);
  }
}

// ─── Engine: crank arm, connecting rod, crosshead, piston rod ──────────────────
export const CRANK_FRAMES = 36;
export function crankStrip(): Strip {
  const F = FLYWHEEL;
  const bx = box(F.x - CRANK.r - 8, F.y - CRANK.r - 8, CRANK.cylinderX + 3, F.y + CRANK.r + 9);
  return strip(bx, CRANK_FRAMES, (b, k) => {
    const psi = F.angle + (Math.PI * 2 * k) / CRANK_FRAMES;
    const px = F.x + Math.cos(psi) * CRANK.r;
    const py = F.y + Math.sin(psi) * CRANK.r;
    const cross = px + Math.sqrt(CRANK.rod * CRANK.rod - (py - F.y) ** 2);
    // crank disc with its counterweight opposite the pin
    b.disc(F.x, F.y, 7.5, (x, y, d) => shade(BRONZE, d > 0.8 ? 0.65 : 1.0 - (y - F.y) * 0.03));
    tube(b, [[F.x - Math.cos(psi) * 5, F.y - Math.sin(psi) * 5], [px, py]], 5, () => BRONZE);
    // piston rod into the cylinder, crosshead between the guides
    for (let x = Math.round(cross); x < CRANK.cylinderX + 3; x++) {
      b.set(x, F.y - 1, add(STEEL, 40));
      b.set(x, F.y, shade(STEEL, 0.75));
    }
    for (let y = F.y - 4; y <= F.y + 4; y++)
      for (let x = Math.round(cross) - 4; x <= Math.round(cross) + 4; x++) {
        const c = y === F.y - 4 ? BRONZE_HI : y === F.y + 4 || x === Math.round(cross) + 4 ? BRONZE_LO : BRONZE;
        b.set(x, y, c);
      }
    // connecting rod: big end at the pin, small end at the crosshead
    tube(b, [[px, py], [cross, F.y]], 3.4, () => shade(STEEL, 0.95), { spec: hex("#eef4f4") });
    b.disc(px, py, 3.2, (x, y, d) => (d > 0.55 ? shade(STEEL, 0.8) : BRONZE_HI));
    b.disc(cross, F.y, 2, () => BRONZE_HI);
  });
}

// ─── Flyball governor ──────────────────────────────────────────────────────────
export function governorStrip(): Strip {
  const G = GOVERNOR;
  const bx = box(G.x - 15, G.y - 6, G.x + 16, G.y + 20);
  const frames = 16;
  return strip(bx, frames, (b, k) => {
    const psi = (Math.PI * k) / frames;
    const balls = [0, Math.PI].map((o) => ({ x: G.x + Math.cos(psi + o) * 10, depth: Math.sin(psi + o) }));
    balls.sort((a, c) => a.depth - c.depth);
    const top = G.y;
    b.rect(G.x - 1, top - 4, 3, 18, STEEL);
    b.rect(G.x - 1, top - 4, 1, 18, add(STEEL, 30));
    b.disc(G.x + 0.5, top - 4, 2.2, () => BRONZE_HI);
    for (const ball of balls) {
      const k2 = 0.7 + ball.depth * 0.3;
      tube(b, [[G.x + 0.5, top], [ball.x + 0.5, top + 11]], 1.6, () => shade(STEEL, k2));
      tube(b, [[G.x + 0.5, top + 14], [ball.x + 0.5, top + 11]], 1.4, () => shade(STEEL, k2 * 0.85));
      b.disc(ball.x + 0.5, top + 11, 3.4, (x, y, d) => shade(BRONZE, k2 * (d < 0.45 && y < top + 11 ? 1.45 : 1.0 - d * 0.3)));
    }
    b.rect(G.x - 3, top + 13, 7, 3, shade(BRONZE, 0.95));
    b.rect(G.x - 3, top + 13, 7, 1, BRONZE_HI);
  });
}

// ─── Clock: anchor and pendulum swing back and forth ───────────────────────────
export function anchorStrip(): Strip {
  const A = ANCHOR;
  const bx = box(A.x - 14, A.y - 5, A.x + 15, A.y + 18);
  const frames = 7;
  return strip(bx, frames, (b, k) => {
    const t = ((-6 + (12 * k) / (frames - 1)) * Math.PI) / 180;
    const rot = (dx: number, dy: number): [number, number] => [A.x + dx * Math.cos(t) - dy * Math.sin(t), A.y + dx * Math.sin(t) + dy * Math.cos(t)];
    for (const side of [-1, 1]) {
      const end = rot(side * 9, 11);
      tube(b, [rot(0, 0), end], 2.2, () => BRONZE, { spec: BRONZE_HI });
      b.rect(end[0] - 1, end[1], 3, 3, STEEL);
      b.set(end[0] - 1, end[1], add(STEEL, 40));
    }
    b.disc(A.x + 0.5, A.y + 0.5, 2.6, (x, y, d) => (d < 0.45 ? shade(STEEL, 0.5) : BRONZE_HI));
  });
}

export function pendulumStrip(): Strip {
  const P = PENDULUM;
  const reach = Math.sin((P.swing * Math.PI) / 180) * P.len + 9;
  const bx = box(P.x - reach, P.y - 2, P.x + reach + 1, P.y + P.len + 9);
  const frames = 9;
  return strip(bx, frames, (b, k) => {
    const t = ((-P.swing + (2 * P.swing * k) / (frames - 1)) * Math.PI) / 180;
    const ex = P.x - Math.sin(t) * P.len;
    const ey = P.y + Math.cos(t) * P.len;
    for (let s = 0; s < P.len - 4; s += 0.5) {
      const x = P.x - Math.sin(t) * s;
      const y = P.y + Math.cos(t) * s;
      b.set(x, y, shade(STEEL, 0.85));
      b.set(x - 1, y, add(STEEL, 20), 0.6);
    }
    b.disc(ex + 0.5, ey, 6.5, (x, y, d) => {
      const lit = (x - ex) * -0.08 + (y - ey) * -0.1;
      if (d > 0.86) return shade(BRONZE, 0.55);
      return shade(BRONZE, 1 + lit + (d < 0.3 && x < ex && y < ey ? 0.35 : 0));
    });
    b.set(ex - 2, ey - 3, hex("#fff0c8"));
  });
}

// ─── Gauges: needle frames from -120° to +120° ─────────────────────────────────
export const NEEDLE_FRAMES = 13;
export function needleStrips(): (Strip & { id: string; rest: number })[] {
  return GAUGES.map((g) => {
    const bx = box(g.x - g.r - 1, g.y - g.r - 1, g.x + g.r + 2, g.y + g.r + 2);
    const s = strip(bx, NEEDLE_FRAMES, (b, k) => needle(b, g.x + 0.5, g.y + 0.5, g.r, -120 + k * 20));
    return { ...s, id: g.id, rest: g.rest };
  });
}

// ─── Steam valve lever: up (closed) to down (open) ─────────────────────────────
export function leverStrip(): Strip {
  const L = LEVER;
  const bx = box(L.x - 16, L.y - 16, L.x + 6, L.y + 8);
  const frames = 4;
  return strip(bx, frames, (b, k) => {
    const t = ((-120 + k * 40) * Math.PI) / 180;
    const ex = L.x + Math.cos(t) * 13;
    const ey = L.y + Math.sin(t) * 13;
    tube(b, [[L.x + 0.5, L.y + 0.5], [ex, ey]], 2.4, () => shade(IRON, 1.5));
    b.disc(ex, ey, 2.4, (x, y, d) => (d < 0.5 ? hex("#e05a3a") : hex("#9a2a1c")));
    b.disc(L.x + 0.5, L.y + 0.5, 2, () => BRONZE_HI);
  });
}

// ─── Furnace fire, seen through the firedoor (the grate bars are in every frame) ─
export function fireStrip(): Strip {
  const F = FURNACE;
  const x0 = F.x - F.w / 2 + 4;
  const y0 = F.y - F.h / 2 + 4;
  const w = F.w - 8;
  const h = F.h - 8;
  const bx = box(x0, y0, x0 + w, y0 + h);
  const frames = 6;
  const seeds = Array.from({ length: w }, (_, i) => Math.sin(i * 12.9898) * 43758.5453 % 1);
  return strip(
    bx,
    frames,
    (b, k) => {
      const ph = (Math.PI * 2 * k) / frames;
      for (let i = 0; i < w; i++) {
        const tongue = 0.55 + 0.22 * Math.sin(i * 0.55 + ph + seeds[i] * 6) + 0.12 * Math.sin(i * 1.7 - ph * 2) + 0.08 * Math.sin(i * 0.21 + ph);
        for (let j = 0; j < h; j++) {
          const x = x0 + i;
          const y = y0 + j;
          const up = 1 - j / h; // 0 at the bottom, 1 at the top
          const v = tongue - up + bayer(x, y) * 0.12;
          let c: RGB | null = null;
          if (v > 0.42) c = hex("#fff6c8");
          else if (v > 0.26) c = hex("#ffd060");
          else if (v > 0.12) c = hex("#ff9a30");
          else if (v > 0.02) c = hex("#d8481c");
          else if (v > -0.06) c = hex("#6a1a0c");
          if (c) b.emit(x, y, c);
          else b.set(x, y, hex("#120806"));
        }
      }
      // coal bed and grate bars in front
      for (let i = 0; i < w; i++)
        for (let j = h - 12; j < h - 4; j++) {
          const glow = (Math.sin(i * 1.3 + j * 2.1 + ph * (i % 3 === 0 ? 1 : -1)) + 1) / 2;
          b.emit(x0 + i, y0 + j, glow > 0.7 ? hex("#ffb040") : glow > 0.35 ? hex("#e05a1c") : hex("#7a200c"));
        }
      for (let x = x0; x < x0 + w; x += 4) for (let j = h - 10; j < h; j++) b.set(x, y0 + j, j === h - 10 ? shade(IRON, 1.5) : shade(IRON, 0.9));
    },
    false,
  );
}

// ─── Status lamp, lit (the domes along the top pipe are painted unlit) ─────────
export function indicatorLit(): Bitmap {
  const b = new Bitmap(5, 5);
  b.disc(2.5, 2.5, 2.5, [80, 255, 170]);
  b.data.forEach((_, i) => {
    if (i % 4 === 3 && b.data[i] > 0) b.data[i] = 90;
  });
  b.disc(2.5, 2.5, 1.6, hex("#6dffb0"));
  b.set(2, 2, hex("#eafff4"));
  return b;
}

// ─── The maintenance automaton ─────────────────────────────────────────────────
// 16×20, facing left. Rows are drawn per frame from parts so the head and body stay identical.
const AUTO_COLORS: Record<string, RGB> = {
  o: hex("#1c130b"),
  b: hex("#a67b43"),
  h: hex("#e6c07c"),
  d: hex("#674621"),
  g: hex("#4f9481"),
  e: hex("#8dffe8"),
  E: hex("#1f3a34"),
  k: hex("#4c4642"),
  K: hex("#a49a90"),
  s: hex("#aab2b2"),
  c: hex("#b5653a"),
  C: hex("#f2a46e"),
  y: hex("#e0b040"),
};
const GLOWING = new Set(["e", "y"]);

const HEAD = [
  "........o.......",
  ".......oeo......",
  "........o.......",
  ".....oooooo.....",
  "....ohhhbbbo....",
  "...ohhbbbbbdo...",
  "...oEeebbbbdo...",
  "...oEeebbbbdo...",
  "...ohbbbbbbdo...",
  "....oddddddo....",
];
const HEAD_STARTLED = [
  ".......oeo......",
  "......oeeeo.....",
  "........o.......",
  ".....oooooo.....",
  "....ohhhbbbo....",
  "...oeeebbbbdo...",
  "...oeEebbbbdo...",
  "...oeeebbbbdo...",
  "...ohbbbbbbdo...",
  "....oddddddo....",
];
const BODY = (key: number) => [
  ".....oo..oo.....",
  key ? "....ohhbbbbdokK." : "....ohhbbbbdoKk.",
  key ? "...ohbbhgbbddok." : "...ohbbhgbbddoK.",
  "...ohbgggbbdo...",
  "...ohbbgbbbdo...",
  "...odbbbbbddo...",
  "....oddddddo....",
];
const LEGS: Record<string, string[]> = {
  stand: [".....oh..do.....", ".....oh..do.....", "....ooo..ooo...."],
  apart: ["....oh....do....", "...oh......do...", "..ooo......ooo.."],
  pass: [".....ohdo.......", ".....oho........", "....ooooo......."],
};
/** Arm + oil can overlays: [row, col, string]. */
const ARMS: Record<string, [number, number, string][]> = {
  carry: [
    [12, 1, "so"],
    [13, 0, "sCo"],
    [14, 0, "ccc"],
    [15, 0, ".c."],
  ],
  oil1: [
    [11, 0, "Css"],
    [12, 0, "cco"],
    [13, 0, "cc."],
  ],
  oil2: [
    [10, 0, "s.."],
    [11, 0, "Css"],
    [12, 0, "cco"],
    [13, 1, "y"],
  ],
  oil3: [
    [10, 0, "s.."],
    [11, 0, "Css"],
    [12, 0, "cco"],
    [15, 1, "y"],
  ],
  up: [
    [4, 1, "s"],
    [5, 1, "s"],
    [6, 1, "s"],
    [3, 0, "ss"],
  ],
  wave1: [
    [2, 1, "ss"],
    [3, 2, "s"],
    [4, 2, "s"],
    [13, 0, "sCo"],
    [14, 0, "ccc"],
  ],
  wave2: [
    [2, 0, "ss"],
    [3, 1, "s"],
    [4, 2, "s"],
    [13, 0, "sCo"],
    [14, 0, "ccc"],
  ],
  drop1: [
    [12, 1, "so"],
    [16, 0, "cC"],
    [17, 0, "cc"],
  ],
  drop2: [
    [12, 1, "so"],
    [18, 0, "Cc"],
    [19, 0, "cc"],
  ],
  drop3: [
    [12, 1, "so"],
    [19, 0, "ccCyy"],
  ],
};

function frame(head: string[], key: number, legs: string, arm: string | null, lift = 0): string[] {
  const rows = [...head, ...BODY(key), ...LEGS[legs]];
  const grid = rows.map((r) => [...r]);
  if (arm)
    for (const [row, col, s] of ARMS[arm]) [...s].forEach((ch, i) => {
      if (ch !== "." && grid[row]) grid[row][col + i] = ch;
    });
  const out = grid.map((r) => r.join(""));
  // lift: shift up (jump), padding the bottom
  return [...out.slice(lift), ...Array(lift).fill("................")];
}

export const AUTOMATON = { w: 16, h: 20 };
export const AUTOMATON_FRAMES: { name: "walk" | "idle" | "oil" | "startle" | "wave" | "drop"; rows: string[] }[] = [
  { name: "walk", rows: frame(HEAD, 0, "apart", "carry") },
  { name: "walk", rows: frame(HEAD, 1, "pass", "carry", 1) },
  { name: "walk", rows: frame(HEAD, 0, "apart", "carry") },
  { name: "walk", rows: frame(HEAD, 1, "stand", "carry", 1) },
  { name: "idle", rows: frame(HEAD, 0, "stand", "carry") },
  { name: "oil", rows: frame(HEAD, 0, "stand", "oil1") },
  { name: "oil", rows: frame(HEAD, 0, "stand", "oil2") },
  { name: "oil", rows: frame(HEAD, 0, "stand", "oil3") },
  { name: "startle", rows: frame(HEAD_STARTLED, 1, "apart", "up", 3) },
  { name: "startle", rows: frame(HEAD_STARTLED, 0, "stand", "up") },
  { name: "wave", rows: frame(HEAD, 0, "stand", "wave1") },
  { name: "wave", rows: frame(HEAD, 1, "stand", "wave2") },
  { name: "drop", rows: frame(HEAD_STARTLED, 0, "stand", "drop1") },
  { name: "drop", rows: frame(HEAD_STARTLED, 0, "stand", "drop2") },
  { name: "drop", rows: frame(HEAD, 0, "stand", "drop3") },
];

export function automatonStrip(): Bitmap {
  const { w, h } = AUTOMATON;
  const b = new Bitmap(w * AUTOMATON_FRAMES.length, h);
  AUTOMATON_FRAMES.forEach((f, k) =>
    f.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const c = AUTO_COLORS[ch];
        if (!c) return;
        if (GLOWING.has(ch)) b.emit(k * w + x, y, c);
        else b.set(k * w + x, y, shade(c, 0.86));
      }),
    ),
  );
  return b;
}
