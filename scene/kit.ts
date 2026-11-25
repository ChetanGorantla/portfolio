// Materials for the engine room: palettes, a height-map relief renderer (bevels and cast shadows the way a pixel
// artist would draw them, light from the top left), riveted iron plates, pipes, lamps, gauges and cast plates.

import { add, Bitmap, bayer, fbm, grain, hex, noise, shade, type Light, type RGB, Rng } from "./paint.ts";

// ─── Palettes ──────────────────────────────────────────────────────────────────
export const BRONZE = hex("#9a7442");
export const BRONZE_HI = hex("#e2bd7a");
export const BRONZE_LO = hex("#4e3519");
export const VERDIGRIS = ["#3f7f6e", "#4f9481", "#356d5f", "#5fa892", "#2c5a4f"].map(hex);
export const COPPER = hex("#a0592f");
export const IRON = hex("#3a3532");
export const IRON_DARK = hex("#1e1b1a");
export const STEEL = hex("#8e9696");
// warm dark iron with a green cast (verdigris country), light enough that lamplight pools read on it
export const WALL = ["#3a3c33", "#403f36", "#35372f", "#43433a", "#3b3e36"].map(hex);
export const IVORY = hex("#e9dfc4");
export const LAMP = hex("#ffe1a3");
export const LAMP_HOT = hex("#fff3d6");
export const FURNACE = hex("#ff8a33");

/** Warm lamplight, cool dark ambient: the engine room's light. */
export const WARM: RGB = [1.05, 0.8, 0.5];

// ─── Relief: heights + colors, baked with pixel-art bevels ─────────────────────
/**
 * A patch of pixels with a height each. `bake` shades them like a pixel artist would with light from the top
 * left: edges facing the light get a highlight, edges facing away a shadow, and anything below a higher neighbor
 * sits in its shadow. Empty pixels are height 0 (the wall behind). `part` tags pixels so a gear's moving parts can
 * be baked separately from its fixed parts.
 */
export class Relief {
  readonly x0: number;
  readonly y0: number;
  readonly w: number;
  readonly h: number;
  readonly height: Float32Array;
  readonly color: Float32Array;
  readonly part: Uint8Array;
  readonly glow: Uint8Array;
  constructor(x0: number, y0: number, w: number, h: number) {
    this.x0 = x0;
    this.y0 = y0;
    this.w = w;
    this.h = h;
    this.height = new Float32Array(w * h);
    this.color = new Float32Array(w * h * 3);
    this.part = new Uint8Array(w * h);
    this.glow = new Uint8Array(w * h);
  }

  /** `x`, `y` in the target bitmap's coordinates. Height must be > 0. */
  put(x: number, y: number, h: number, c: RGB, part = 0, glow = false) {
    const i = this.index(x, y);
    if (i < 0) return;
    this.height[i] = h;
    this.color[i * 3] = c[0];
    this.color[i * 3 + 1] = c[1];
    this.color[i * 3 + 2] = c[2];
    this.part[i] = part;
    this.glow[i] = glow ? 1 : 0;
  }

  index(x: number, y: number) {
    const lx = Math.floor(x) - this.x0;
    const ly = Math.floor(y) - this.y0;
    return lx < 0 || ly < 0 || lx >= this.w || ly >= this.h ? -1 : ly * this.w + lx;
  }

  heightAt(x: number, y: number) {
    const i = this.index(x, y);
    return i < 0 ? 0 : this.height[i];
  }

  /**
   * Write the shaded pixels into `b`. `only` limits it to one part. Cast shadows fall down and to the right onto
   * whatever is below: on a painted bitmap they darken it ("tint"), on an empty sprite frame they become
   * see-through black ("alpha").
   */
  bake(
    b: Bitmap,
    { only, shadow = "tint", cast = 2, strength = 1, ox = 0, oy = 0 }: { only?: number; shadow?: "tint" | "alpha"; cast?: number; strength?: number; ox?: number; oy?: number } = {},
  ) {
    const H = (x: number, y: number) => this.heightAt(x, y);
    for (let ly = 0; ly < this.h; ly++)
      for (let lx = 0; lx < this.w; lx++) {
        const i = ly * this.w + lx;
        const x = lx + this.x0;
        const y = ly + this.y0;
        // (x, y) are layer coordinates; `b` may start at (ox, oy) in the layer.
        const bx = x - ox;
        const by = y - oy;
        const hp = this.height[i];
        if (hp > 0) {
          if (only !== undefined && this.part[i] !== only) continue;
          let c: RGB = [this.color[i * 3], this.color[i * 3 + 1], this.color[i * 3 + 2]];
          if (this.glow[i]) {
            b.emit(bx, by, c);
            continue;
          }
          const up = H(x, y - 1);
          const left = H(x - 1, y);
          const down = H(x, y + 1);
          const right = H(x + 1, y);
          const lit = hp > up + 0.2 || hp > left + 0.2;
          const dark = hp > down + 0.2 || hp > right + 0.2;
          if (lit) c = add(shade(c, 1 + 0.2 * strength), 10 * strength);
          else if (dark) c = shade(c, 1 - 0.3 * strength);
          // In the shadow of something higher up and to the left.
          const above = Math.max(up, left, H(x - 1, y - 1), cast > 1 ? H(x - 2, y - 2) - 0.8 : 0);
          if (!lit && above > hp + 0.4) c = shade(c, 1 - Math.min(0.45, (above - hp) * 0.16) * strength);
          b.set(bx, by, c);
        } else if (cast > 0) {
          // The wall (or empty frame) just below and right of a raised edge.
          let depth = 0;
          for (let d = 1; d <= cast; d++) {
            const j = this.index(x - d, y - d);
            if (j >= 0 && this.height[j] >= d + 0.5 && (only === undefined || this.part[j] === only)) depth = Math.max(depth, (cast + 1 - d) / (cast + 1));
          }
          if (depth > 0) {
            if (shadow === "tint") b.tint(bx, by, 1 - 0.42 * depth * strength);
            else b.set(bx, by, [0, 0, 0], 0.4 * depth * strength);
          }
        }
      }
  }
}

// ─── Lighting helpers ──────────────────────────────────────────────────────────
export interface LayerLight extends Light {
  /** Identifies a lamp that can be switched off. */
  id?: string;
}

/** Light a bitmap that sits at (ox, oy) in a layer, then pull it toward the layer's fog. */
export function finish(b: Bitmap, lights: Light[], ambient: RGB, levels: number, ox: number, oy: number, fog?: { color: RGB; amount: number }) {
  b.light(lights, ambient, { offsetX: ox, offsetY: oy, levels });
  if (!fog) return;
  const d = b.data;
  for (let i = 0; i < b.w * b.h; i++) {
    if (d[i * 4 + 3] === 0 || b.glow[i]) continue;
    for (let c = 0; c < 3; c++) d[i * 4 + c] += (fog.color[c] - d[i * 4 + c]) * fog.amount;
  }
}

// ─── Small parts ───────────────────────────────────────────────────────────────
/** A 2×2 rivet head (or 3×3 for big plates). */
export function rivet(b: Bitmap, x: number, y: number, base: RGB, big = false) {
  if (big) {
    b.set(x + 1, y, add(base, 34));
    b.set(x, y + 1, add(base, 28));
    b.set(x + 1, y + 1, add(base, 16));
    b.set(x + 2, y + 1, shade(base, 0.7));
    b.set(x + 1, y + 2, shade(base, 0.55));
    b.set(x + 2, y + 2, shade(base, 0.4), 0.7);
    return;
  }
  b.set(x, y, add(base, 30));
  b.set(x + 1, y, add(base, 8));
  b.set(x, y + 1, shade(base, 0.85));
  b.set(x + 1, y + 1, shade(base, 0.45));
}

/** Rust-green streaks running down from a point: verdigris weeping from a rivet or seam. */
export function streak(b: Bitmap, r: Rng, x: number, y: number, len: number, color: RGB) {
  let px = x;
  for (let i = 0; i < len; i++) {
    const a = (1 - i / len) * 0.55;
    if (r.chance(0.85)) b.set(px, y + i, color, a);
    if (r.chance(0.08)) px += r.chance(0.5) ? 1 : -1;
  }
}

// ─── Riveted iron wall ─────────────────────────────────────────────────────────
/** Courses of riveted iron plates with seams, rivet rows, grime and weeping verdigris. */
export function plateWall(b: Bitmap, r: Rng, x0: number, y0: number, w: number, h: number, palette: RGB[] = WALL, plateH: [number, number] = [44, 62]) {
  const tex = fbm(r.int(1, 1e6), 9, 3);
  const speck = grain(r.int(1, 1e6));
  let y = y0;
  while (y < y0 + h) {
    const ph = Math.min(r.int(plateH[0], plateH[1]), y0 + h - y);
    let x = x0 - r.int(0, 60);
    while (x < x0 + w) {
      const pw = r.int(70, 150);
      const base = r.jitter(r.pick(palette), 4);
      const sx = Math.max(x0, x);
      const ex = Math.min(x0 + w, x + pw);
      for (let py = y; py < y + ph; py++)
        for (let px = sx; px < ex; px++) {
          const t = (py - y) / ph;
          // grime gathers toward the bottom of each plate
          let c = shade(base, 0.9 + tex(px, py) * 0.22 - t * t * 0.18);
          const s = speck(px, py);
          if (s > 0.985) c = add(c, 10);
          else if (s < 0.012) c = add(c, -10);
          b.set(px, py, c);
        }
      // seams: dark gap, lit lip below and right
      for (let px = sx; px < ex; px++) {
        b.set(px, y, shade(base, 0.45));
        b.set(px, y + 1, add(base, 9));
      }
      for (let py = y; py < y + ph; py++) {
        b.set(x, py, shade(base, 0.45));
        b.set(x + 1, py, add(base, 7));
      }
      // rivet rows along the edges
      const rivetBase = add(base, 6);
      for (let px = x + 5; px < x + pw - 3; px += 7) {
        if (px >= sx && px < ex) {
          rivet(b, px, y + 3, rivetBase);
          rivet(b, px, y + ph - 4, rivetBase);
        }
      }
      for (let py = y + 10; py < y + ph - 6; py += 7) {
        if (x + 4 >= sx && x + 4 < ex) rivet(b, x + 4, py, rivetBase);
      }
      // weeping verdigris and rust from a few rivets
      for (let k = 0; k < 3; k++)
        if (r.chance(0.45)) {
          const px = x + 5 + 7 * r.int(0, Math.floor((pw - 8) / 7));
          if (px >= sx && px < ex) streak(b, r, px, y + 5, r.int(8, ph - 6), r.chance(0.7) ? r.pick(VERDIGRIS) : hex("#5a3a22"));
        }
      x += pw;
    }
    y += ph;
  }
}

// ─── Tubes: pipes, rods, rails ─────────────────────────────────────────────────
const LIGHT_DIR = (() => {
  const v = [-0.45, -0.7, 0.55];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();

/** How a point on a cylinder is lit: across-tube offset t in [-1, 1] along the unit normal (nx, ny). */
export function tubeShade(nx: number, ny: number, t: number) {
  const z = Math.sqrt(Math.max(0, 1 - t * t));
  const lam = Math.max(0, nx * t * LIGHT_DIR[0] + ny * t * LIGHT_DIR[1] + z * LIGHT_DIR[2]);
  // banded, the way a pixel artist shades a cylinder
  const band = Math.round(lam * 5) / 5;
  return { k: 0.38 + band * 0.75, spec: lam > 0.93 };
}

/**
 * A tube of diameter `d` along a polyline (pipes, rods, handrails). `color(x, y)` gives the base color, so callers
 * can add patina. Corners come out rounded on the outside.
 */
export function tube(b: Bitmap, pts: [number, number][], d: number, color: (x: number, y: number) => RGB, opts: { spec?: RGB; flanges?: number; flangeColor?: RGB } = {}) {
  const rad = d / 2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY - rad - 1); y <= Math.ceil(maxY + rad + 1); y++)
    for (let x = Math.floor(minX - rad - 1); x <= Math.ceil(maxX + rad + 1); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let best = Infinity;
      let nx = 0;
      let ny = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        const vx = bx - ax;
        const vy = by - ay;
        const len2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
        const qx = ax + vx * t;
        const qy = ay + vy * t;
        const dd = Math.hypot(px - qx, py - qy);
        if (dd < best) {
          best = dd;
          nx = dd ? (px - qx) / dd : 0;
          ny = dd ? (py - qy) / dd : 0;
        }
      }
      if (best > rad) continue;
      const s = tubeShade(nx, ny, best / rad);
      let c = shade(color(x, y), s.k);
      if (s.spec && opts.spec) c = opts.spec;
      if (best > rad - 0.9) c = shade(c, 0.6); // outline
      b.set(x, y, c);
    }
}

/** A flange (or coupling) ring across a pipe running horizontally (`dir` "h") or vertically. */
export function flange(b: Bitmap, x: number, y: number, d: number, dir: "h" | "v", base: RGB) {
  const len = d + 4;
  for (let k = 0; k < 3; k++)
    for (let j = 0; j < len; j++) {
      const t = (j - len / 2 + 0.5) / (len / 2);
      const s = tubeShade(dir === "h" ? 0 : 1, dir === "h" ? 1 : 0, t);
      let c = shade(base, s.k * (k === 1 ? 1.08 : 0.92));
      if (k === 2) c = shade(c, 0.75);
      if (dir === "h") b.set(x + k, y - len / 2 + j, c);
      else b.set(x - len / 2 + j, y + k, c);
    }
  // bolt heads
  if (dir === "h") {
    rivet(b, x, y - len / 2 + 1, add(base, 10));
    rivet(b, x, y + len / 2 - 3, add(base, 10));
  } else {
    rivet(b, x - len / 2 + 1, y, add(base, 10));
    rivet(b, x + len / 2 - 3, y, add(base, 10));
  }
}

/** Bronze or copper with patches of verdigris: a color function for `tube` and friends. */
export function patinated(seed: number, base: RGB, amount = 0.5, scale = 7) {
  const blot = fbm(seed, scale, 3);
  const fine = noise(seed + 7, 2);
  return (x: number, y: number): RGB => {
    const v = blot(x, y);
    const k = 0.92 + fine(x, y) * 0.16;
    if (v + bayer(x, y) * 0.08 > 1 - amount * 0.55) return shade(VERDIGRIS[Math.floor(fine(x * 3, y * 3) * VERDIGRIS.length)], k);
    return shade(base, k);
  };
}

// ─── Lamps ─────────────────────────────────────────────────────────────────────
/** Where a pendant lamp hung at (x, y) gives off its light. */
export const LAMP_BULB = { dx: 0.5, dy: 12 };

/**
 * An industrial pendant lamp hanging from (x, y): a rod, a green enamel shade (white inside), a bulb under it.
 * Bulb pixels glow (lighting leaves them alone) unless `off`.
 */
export function cagedLamp(b: Bitmap, x: number, y: number, off = false) {
  const enamel = hex("#2f5546");
  // rod and canopy
  for (let i = 0; i < 5; i++) b.set(x, y + i, i === 0 ? add(IRON, 25) : IRON);
  b.rect(x - 1, y + 5, 3, 2, BRONZE);
  b.set(x - 1, y + 5, BRONZE_HI);
  // shade: a cone, lit on the left, white enamel showing at the rim
  for (let j = 0; j < 5; j++) {
    const half = 2 + j * 1.3;
    for (let i = Math.round(-half); i <= Math.round(half); i++) {
      const t = (i + half) / (half * 2);
      b.set(x + i, y + 7 + j, j === 4 ? hex("#e8e2cf") : shade(enamel, 1.35 - t * 0.6));
    }
  }
  // bulb under the shade
  const cx = x + LAMP_BULB.dx;
  const cy = y + LAMP_BULB.dy + 1;
  for (let py = Math.floor(cy - 2); py <= cy + 2; py++)
    for (let px = Math.floor(cx - 3); px <= cx + 3; px++) {
      const d = Math.hypot((px + 0.5 - cx) / 2.6, (py + 0.5 - cy) / 2.4);
      if (d > 1 || py < y + 12) continue;
      if (off) b.set(px, py, d > 0.7 ? hex("#4a483e") : hex("#77735f"));
      else b.emit(px, py, d < 0.55 ? LAMP_HOT : LAMP);
    }
}

// ─── Gauges ────────────────────────────────────────────────────────────────────
/** A round pressure gauge: bronze bezel, cream dial, ticks and a red zone. The needle is separate (`needle`). */
export function gauge(b: Bitmap, r: Rng, cx: number, cy: number, rad: number) {
  const face = hex("#d9cfb2");
  b.disc(cx, cy, rad + 2.5, (x, y, d) => {
    if (d > (rad + 1) / (rad + 2.5)) {
      const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      const lit = -Math.sin(ang + Math.PI / 4);
      return shade(BRONZE, 0.75 + lit * 0.35);
    }
    return null;
  });
  b.disc(cx, cy, rad + 1, (x, y) => shade(face, 0.82 + ((y - cy) / rad) * -0.06));
  b.disc(cx, cy, rad, (x, y) => shade(face, 0.97 - Math.hypot(x - cx, y - cy) / rad * 0.1 + r.range(-0.02, 0.02)));
  // ticks from -135° to +135°, red zone at the end
  for (let k = 0; k <= 10; k++) {
    const a = ((-135 + k * 27) * Math.PI) / 180 - Math.PI / 2;
    const tickColor = k >= 8 ? hex("#a8322a") : hex("#3a332a");
    for (let s = rad - 2; s <= rad - (k % 5 === 0 ? 0.3 : 1.1); s += 0.5) b.set(cx + Math.cos(a) * s - 0.5, cy + Math.sin(a) * s - 0.5, tickColor);
  }
  // glass glint
  b.set(cx - rad * 0.45, cy - rad * 0.55, [255, 255, 248], 0.55);
  b.set(cx - rad * 0.55, cy - rad * 0.4, [255, 255, 248], 0.35);
}

/** A gauge needle at `a` degrees (0 = straight up, ±135 the ends of the scale) on an empty sprite frame. */
export function needle(b: Bitmap, cx: number, cy: number, rad: number, a: number) {
  const t = ((a - 90) * Math.PI) / 180;
  const red = hex("#8a1e18");
  for (let s = -1.5; s <= rad - 1.5; s += 0.4) b.set(cx + Math.cos(t) * s - 0.5, cy + Math.sin(t) * s - 0.5, s > rad * 0.6 ? red : hex("#231d18"));
  b.set(cx - 0.5, cy - 0.5, BRONZE_HI);
}
