// Gears, painted at any angle. A gear is split into what looks the same at every angle (rim, hub, a solid web),
// which is painted once into its layer, and what moves (teeth, spokes, lightening holes), which becomes a strip of
// frames covering one symmetry period, so a 24-tooth, 6-spoke gear needs frames for 60° of turn only. The frames
// are lit by the same lights and dither grid as the layer, so the two halves fit together pixel for pixel.

import { Bitmap, fbm, noise, shade, type Light, type RGB } from "./paint.ts";
import { BRONZE, BRONZE_HI, finish, IRON, IRON_DARK, Relief, VERDIGRIS } from "./kit.ts";

export type GearStyle = "spoked" | "holes" | "solid";
export type Metal = "bronze" | "iron" | "dark";

export interface Gear {
  id: string;
  x: number;
  y: number;
  /** Outer radius, tooth tips included. */
  r: number;
  /** 0 for a plain wheel (a flywheel). A multiple of `spokes`. */
  teeth: number;
  spokes: number;
  style: GearStyle;
  metal: Metal;
  /** Angle (radians) of frame 0, set so meshing teeth interlock. */
  angle: number;
  /** "saw" for an escape wheel's raked teeth. */
  profile?: "gear" | "saw";
  seed: number;
}

export const STATIC = 0;
export const MOVING = 1;

export function geometry(g: Gear) {
  const toothH = g.teeth ? Math.max(2, Math.round(g.r * 0.1)) : 0;
  const root = g.r - toothH;
  const rimW = g.teeth ? Math.max(2, Math.round(g.r * 0.13)) : Math.max(3, Math.round(g.r * 0.15));
  const rimIn = root - rimW;
  const hub = Math.max(2, Math.round(g.r * 0.2));
  const bore = Math.max(1, Math.round(hub * 0.42));
  const pitch = g.teeth ? (Math.PI * 2) / g.teeth : Infinity;
  /** Angle after which the moving part looks the same again. */
  const period = (Math.PI * 2) / Math.max(1, g.spokes);
  return { toothH, root, rimIn, hub, bore, pitch, period, teethPerPeriod: g.teeth / Math.max(1, g.spokes) };
}

/** The pitch radius: where two meshing gears' teeth meet. */
export const pitchRadius = (g: Pick<Gear, "r">) => g.r - Math.max(2, Math.round(g.r * 0.1)) / 2;

const METALS: Record<Metal, { base: RGB; hi: RGB; patina: number }> = {
  bronze: { base: BRONZE, hi: BRONZE_HI, patina: 0.5 },
  iron: { base: IRON, hi: shade(IRON, 1.6), patina: 0.15 },
  dark: { base: shade(BRONZE, 0.62), hi: shade(BRONZE_HI, 0.6), patina: 0.65 },
};

/** The box (4px-aligned to the dither grid) that holds the gear at any angle, cast shadow included. */
export function gearBox(g: Gear) {
  const x = Math.floor((g.x - g.r - 1) / 4) * 4;
  const y = Math.floor((g.y - g.r - 1) / 4) * 4;
  return { x, y, w: Math.ceil(g.x + g.r + 4) - x, h: Math.ceil(g.y + g.r + 4) - y };
}

function relief(g: Gear, theta: number): Relief {
  const geo = geometry(g);
  const box = gearBox(g);
  const rel = new Relief(box.x, box.y, box.w, box.h);
  const m = METALS[g.metal];
  const tex = noise(g.seed, 3);
  const blot = fbm(g.seed + 11, 6, 3);
  const TAU = Math.PI * 2;

  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++) {
      const dx = x + 0.5 - g.x;
      const dy = y + 0.5 - g.y;
      const d = Math.hypot(dx, dy);
      if (d > g.r) continue;
      const local = Math.atan2(dy, dx) - theta;
      // Texture coordinates turn with the gear; for moving parts they repeat every period so the strip loops.
      const fold = ((local % geo.period) + geo.period) % geo.period;
      const u = d * Math.cos(fold);
      const v = d * Math.sin(fold);

      let h = 0;
      let part = STATIC;
      let kind: "tooth" | "rim" | "web" | "spoke" | "hub" | "bore" = "rim";
      if (d >= geo.root) {
        if (!g.teeth) continue;
        const along = (((local / geo.pitch) % 1) + 1) % 1; // 0..1 around one tooth, tooth centered at 0
        const t = (d - geo.root) / geo.toothH;
        const centered = along > 0.5 ? along - 1 : along;
        const half = g.profile === "saw" ? 0.32 - 0.24 * t : 0.27 - 0.1 * t;
        const lean = g.profile === "saw" ? t * 0.18 : 0;
        if (Math.abs(centered - lean) > half) continue;
        h = 3;
        part = MOVING;
        kind = "tooth";
      } else if (d >= geo.rimIn) {
        h = 3;
        // The rim's outer pixels are shaded by whichever tooth or gap is next to them, so they move too.
        part = g.teeth && d >= geo.root - 1.2 ? MOVING : STATIC;
        kind = "rim";
      } else if (d <= geo.bore) {
        h = 1;
        kind = "bore";
      } else if (d <= geo.hub) {
        h = 4;
        kind = "hub";
      } else if (g.style === "solid") {
        h = Math.abs(d - (geo.hub + geo.rimIn) / 2) < 0.8 ? 1.2 : 1.8;
        kind = "web";
      } else if (g.style === "spoked") {
        const sector = TAU / g.spokes;
        const a = (((local % sector) + sector) % sector) - sector / 2;
        // Spokes taper from hub to rim; `a` is the angle from the nearest spoke's center line.
        const spokeHalf = Math.max(1.1, g.r * 0.075) * (1.25 - ((d - geo.hub) / (geo.rimIn - geo.hub)) * 0.4);
        if (Math.abs(Math.sin(a) * d) > spokeHalf || Math.abs(a) > sector / 4) continue;
        h = 2.5;
        part = MOVING;
        kind = "spoke";
      } else {
        const sector = TAU / g.spokes;
        const a = (((local % sector) + sector) % sector) - sector / 2;
        const hr = (geo.hub + geo.rimIn) / 2;
        const holeR = (geo.rimIn - geo.hub) * 0.34;
        const hx = d * Math.cos(a) - hr;
        const hy = d * Math.sin(a);
        if (Math.hypot(hx, hy) < holeR) continue;
        h = 2;
        part = MOVING;
        kind = "web";
      }

      // Fixed parts never turn, so they use plain coordinates (no repeating pattern).
      const tu = part === STATIC ? dx + 50 : u;
      const tv = part === STATIC ? dy + 50 : v;
      let c: RGB = shade(m.base, 0.9 + tex(tu, tv) * 0.2);
      const pat = blot(tu, tv);
      const recess = kind === "web" ? 0.14 : kind === "tooth" ? -0.25 : kind === "spoke" ? -0.08 : 0;
      if (pat + recess > 1 - m.patina * 0.6) c = shade(VERDIGRIS[Math.floor(tex(tu * 2.3, tv * 2.3) * VERDIGRIS.length)], 0.88 + tex(tv, tu) * 0.18);
      if (kind === "tooth" && d > g.r - 1.2) c = shade(m.hi, 0.9); // tips worn bright by meshing
      if (kind === "hub") c = shade(m.base, 1.02 + tex(tu, tv) * 0.1);
      if (kind === "bore") c = IRON_DARK;
      rel.put(x, y, h, c, part);
    }
  return rel;
}

/** Paint the gear's fixed parts into its layer (unlit: the layer is lit afterwards). */
export function paintGearStatic(b: Bitmap, g: Gear) {
  relief(g, g.angle).bake(b, { only: STATIC, shadow: "tint" });
}

/** Paint the whole gear (fixed and moving parts) at its frame-0 angle, for stills like the share image. */
export function paintGearWhole(b: Bitmap, g: Gear) {
  relief(g, g.angle).bake(b, { shadow: "tint" });
}

export interface StripInfo {
  frames: number;
  fw: number;
  fh: number;
  x: number;
  y: number;
}

/** How many frames the moving part needs: about one frame per 1.6px of travel at the rim. */
export function frameCount(g: Gear) {
  const geo = geometry(g);
  const travel = g.r * geo.period;
  const fw = gearBox(g).w;
  return Math.max(6, Math.min(Math.round(travel / 1.6), 48, Math.floor(8000 / fw)));
}

/** Frames of the moving part through one period, lit like the layer, left to right in one strip. */
export function gearStrip(g: Gear, lights: Light[], ambient: RGB, levels: number, fog?: { color: RGB; amount: number }): { strip: Bitmap; info: StripInfo } {
  const geo = geometry(g);
  const box = gearBox(g);
  const frames = frameCount(g);
  const strip = new Bitmap(box.w * frames, box.h);
  for (let k = 0; k < frames; k++) {
    const frame = new Bitmap(box.w, box.h);
    relief(g, g.angle + (geo.period * k) / frames).bake(frame, { only: MOVING, shadow: "alpha", ox: box.x, oy: box.y });
    finish(frame, lights, ambient, levels, box.x, box.y, fog);
    strip.blit(frame, k * box.w, 0);
  }
  return { strip, info: { frames, fw: box.w, fh: box.h, x: box.x, y: box.y } };
}
