// Procedural pixel painting, ported from the blog (Journals by the Hearth). Scenes are painted into an RGBA
// buffer at "art pixel" resolution with a seeded random generator (so every rivet and gear tooth is different,
// but identical on every build), lit with ordered dithering (light falls off in pixel-art steps, not smooth
// gradients), then written to PNG at build time (scene/build.ts) and scaled up by CSS with crisp edges.
//
// Runs under Node's built-in TypeScript type stripping: no enums, no parameter properties, `import type` only.

export type RGB = readonly [number, number, number];

export const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const shade = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f];
export const add = (c: RGB, d: number): RGB => [c[0] + d, c[1] + d, c[2] + d];

/** Deterministic random numbers (mulberry32). */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(a: number, b: number) {
    return a + Math.floor(this.next() * (b - a + 1));
  }
  range(a: number, b: number) {
    return a + this.next() * (b - a);
  }
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }
  chance(p: number) {
    return this.next() < p;
  }
  /** A color nudged by up to ±amount per channel (and a shared brightness wobble). */
  jitter(c: RGB, amount: number): RGB {
    const b = this.range(-amount, amount);
    return [c[0] + b + this.range(-amount, amount) * 0.4, c[1] + b + this.range(-amount, amount) * 0.4, c[2] + b + this.range(-amount, amount) * 0.4];
  }
}

/** A repeatable pseudo-random value in [0, 1) for a pixel. */
export function hash(x: number, y: number, seed: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1]; `scale` is the feature size in pixels. */
export function noise(seed: number, scale: number) {
  return (x: number, y: number) => {
    const fx = x / scale;
    const fy = y / scale;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = hash(x0, y0, seed);
    const b = hash(x0 + 1, y0, seed);
    const c = hash(x0, y0 + 1, seed);
    const d = hash(x0 + 1, y0 + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/** Layered noise (big shapes plus finer grain), in [0, 1]. */
export function fbm(seed: number, scale: number, octaves = 3) {
  const layers = Array.from({ length: octaves }, (_, i) => noise(seed + i * 101, scale / 2 ** i));
  return (x: number, y: number) => {
    let sum = 0;
    let weight = 0;
    layers.forEach((n, i) => {
      const w = 1 / 2 ** i;
      sum += n(x, y) * w;
      weight += w;
    });
    return sum / weight;
  };
}

/** White-noise value per pixel, in [0, 1). */
export const grain = (seed: number) => (x: number, y: number) => hash(x, y, seed);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither threshold for a pixel, in [-0.5, 0.5). */
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;

export interface Light {
  x: number;
  y: number;
  /** Reach in pixels. */
  r: number;
  /** Added light at the center, per channel (1 = full albedo). */
  color: RGB;
}

/** A scene's lighting: its lights (in scene px), the ambient light, and how many steps light falls off in. */
export interface Shading {
  lights: Light[];
  ambient: RGB;
  levels: number;
}

export class Bitmap {
  readonly data: Float32Array;
  /** Pixels that give off light: the lighting pass leaves them alone (see `emit`). */
  readonly glow: Uint8Array;
  readonly w: number;
  readonly h: number;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Float32Array(w * h * 4);
    this.glow = new Uint8Array(w * h);
  }

  /** Paint a light-giving pixel (window views, lamp shades, embers). Painting over it later makes it ordinary again. */
  emit(x: number, y: number, c: RGB) {
    this.set(x, y, c);
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.glow[y * this.w + x] = 1;
  }

  /** Paint one pixel; `a` < 1 blends over what's there. */
  set(x: number, y: number, c: RGB, a = 1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const d = this.data;
    const i = (y * this.w + x) * 4;
    if (a > 0.5) this.glow[y * this.w + x] = 0;
    if (a >= 1 || d[i + 3] === 0) {
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = Math.max(d[i + 3], Math.min(1, a) * 255);
      return;
    }
    d[i] += (c[0] - d[i]) * a;
    d[i + 1] += (c[1] - d[i + 1]) * a;
    d[i + 2] += (c[2] - d[i + 2]) * a;
    d[i + 3] = Math.max(d[i + 3], a * 255);
  }

  get(x: number, y: number): RGB {
    x = Math.min(this.w - 1, Math.max(0, Math.floor(x)));
    y = Math.min(this.h - 1, Math.max(0, Math.floor(y)));
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }

  painted(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.data[(Math.floor(y) * this.w + Math.floor(x)) * 4 + 3] > 0;
  }

  /** Multiply existing color (darken < 1 < brighten). */
  tint(x: number, y: number, f: RGB | number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (this.data[i + 3] === 0) return;
    const [r, g, b] = typeof f === "number" ? [f, f, f] : f;
    this.data[i] *= r;
    this.data[i + 1] *= g;
    this.data[i + 2] *= b;
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, a = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }

  /** Paint every pixel of a box with whatever `fn` returns (null = leave alone). */
  each(x: number, y: number, w: number, h: number, fn: (x: number, y: number) => RGB | null | undefined) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) {
        const c = fn(i, j);
        if (c) this.set(i, j, c);
      }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  disc(cx: number, cy: number, r: number, c: RGB | ((x: number, y: number, d: number) => RGB | null)) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d > r) continue;
        const col = typeof c === "function" ? c(x, y, d / r) : c;
        if (col) this.set(x, y, col);
      }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB | ((x: number, y: number, d: number) => RGB | null)) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
        if (d > 1) continue;
        const col = typeof c === "function" ? c(x, y, d) : c;
        if (col) this.set(x, y, col);
      }
  }

  /** Fill pixels nothing has painted yet (e.g. the sky behind everything). */
  fillEmpty(fn: (x: number, y: number) => RGB) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.painted(x, y)) this.set(x, y, fn(x, y));
  }

  /**
   * Light the painted pixels: ambient plus each light's falloff, quantized to `levels` steps with
   * ordered dithering. `offsetX/Y` place this bitmap in the scene the lights are measured in.
   */
  light(lights: Light[], ambient: RGB, { offsetX = 0, offsetY = 0, levels = 9 } = {}) {
    const d = this.data;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        if (d[i + 3] === 0 || this.glow[y * this.w + x]) continue;
        let r = ambient[0];
        let g = ambient[1];
        let b = ambient[2];
        const sx = x + offsetX;
        const sy = y + offsetY;
        for (const L of lights) {
          const dx = sx - L.x;
          const dy = sy - L.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= L.r * L.r) continue;
          const f = 1 - Math.sqrt(d2) / L.r;
          const k = f * Math.sqrt(f); // wider pools than f², still pixel-stepped by the dither below
          r += L.color[0] * k;
          g += L.color[1] * k;
          b += L.color[2] * k;
        }
        const t = bayer(x, y);
        d[i] *= Math.max(0, Math.round(r * levels + t) / levels);
        d[i + 1] *= Math.max(0, Math.round(g * levels + t) / levels);
        d[i + 2] *= Math.max(0, Math.round(b * levels + t) / levels);
      }
  }

  /** A copy of the w×h part at (x, y), glowing pixels included. */
  crop(x: number, y: number, w: number, h: number) {
    const out = new Bitmap(w, h);
    for (let j = 0; j < h; j++) {
      const from = (y + j) * this.w + x;
      out.data.set(this.data.subarray(from * 4, (from + w) * 4), j * w * 4);
      out.glow.set(this.glow.subarray(from, from + w), j * w);
    }
    return out;
  }

  /** Composite another bitmap on top at (x, y). */
  blit(src: Bitmap, x: number, y: number) {
    for (let j = 0; j < src.h; j++)
      for (let i = 0; i < src.w; i++) {
        const k = (j * src.w + i) * 4;
        const a = src.data[k + 3] / 255;
        if (a > 0) this.set(x + i, y + j, [src.data[k], src.data[k + 1], src.data[k + 2]], a);
      }
  }

  /** 8-bit RGBA bytes (rounded and clamped), for the PNG encoder. */
  toRGBA8(): Uint8Array {
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    out.set(this.data);
    return new Uint8Array(out.buffer);
  }
}

// ─── Tiny pixel font (3×5) for carved and chalked lettering ────────────────────
const GLYPHS: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", K: "101101110101101", L: "100100100100111", M: "101111111101101",
  N: "110101101101101", O: "010101101101010", P: "110101110100100", R: "110101110101101",
  S: "011100010001110", T: "111010010010010", U: "101101101101111", W: "101101111111101",
  Y: "101101010010010", "0": "010101101101010", "1": "010110010010111", "2": "110001010100111",
  "3": "110001010001110", "4": "101101111001001", "5": "111100110001110", "6": "011100110101010",
  "7": "111001010010010", "8": "010101010101010", "9": "010101011001110", ".": "000000000000010",
  " ": "000000000000000", J: "001001001101010", Q: "010101101110011", V: "101101101101010", X: "101101010101101", Z: "111001010100111", "'": "010010000000000", "!": "010010010000010", "-": "000000111000000",
};

/** Width of `text` in the 3×5 font (1px between letters). */
export const textWidth = (text: string) => text.length * 4 - 1;

export function drawText(b: Bitmap, text: string, x: number, y: number, color: (x: number, y: number) => RGB | null) {
  [...text.toUpperCase()].forEach((ch, n) => {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 3; i++)
        if (g[j * 3 + i] === "1") {
          const c = color(x + n * 4 + i, y + j);
          if (c) b.set(x + n * 4 + i, y + j, c);
        }
  });
}
