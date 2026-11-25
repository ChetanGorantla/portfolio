// Where everything in the engine room is. Coordinates are art pixels in each layer (1 art px = 2 CSS px). Layers are
// SCENE_W wide and centered on the page, so the content column (1100 CSS px max) spans x 365–915 and the margins
// beside it are what wide screens see: x 320–365 and 915–960 on a 1280px screen, more on wider ones.
// The mid layer is laid out in zones from top to bottom: upper works (fine clockwork, the flywheel engine beside the
// hero), middle works (pipes, valves, gauges), heavy works (boiler, big gear trains, the furnace).

import { geometry, pitchRadius, type Gear, type GearStyle, type Metal } from "./gear.ts";
import { LAMP_BULB, WARM, type LayerLight } from "./kit.ts";
import type { RGB } from "./paint.ts";

export const SCENE_W = 1280;
export const CX = SCENE_W / 2;
export const COL_L = 365;
export const COL_R = 915;
/** The open middle of the mid layer (no wall): the far layer shows through it. */
export const OPENING = { x0: 386, x1: 896, y0: 48, y1: 578 };

export const LAYERS = {
  far: { height: 900, rate: 0.1 },
  mid: { height: 1100, rate: 0.2 },
  near: { height: 1350, rate: 0.35 },
} as const;

export const LEVELS = 12;
export const AMBIENT: Record<"far" | "mid" | "near", RGB> = {
  far: [0.27, 0.3, 0.32],
  mid: [0.36, 0.39, 0.4],
  near: [0.26, 0.27, 0.28],
};
export const FOG = { color: [18, 30, 32] as RGB, amount: 0.4 };

const warm = (k: number): RGB => [WARM[0] * k, WARM[1] * k, WARM[2] * k];

// ─── Gear trains ───────────────────────────────────────────────────────────────
export interface TrainGear extends Gear {
  train: string;
  /** Plays backwards (meshing gears turn opposite ways). */
  reverse: boolean;
  /** Seconds per loop of its strip. */
  duration: number;
}

interface Link {
  r: number;
  /** Direction from the previous gear, degrees (0 = right, 90 = down). */
  dir: number;
  spokes: number;
  style: GearStyle;
  metal?: Metal;
}

/**
 * A train of meshing gears starting at (x, y). Every gear shares the train's tooth pitch (`pitch` px of rim per
 * tooth), so they turn at speeds that match, and each one's frame 0 is rotated so its teeth sit in the previous
 * gear's gaps. `toothTime` is the seconds it takes one tooth to pass.
 */
function train(id: string, x: number, y: number, pitch: number, toothTime: number, links: Link[], seed: number, metal: Metal = "bronze"): TrainGear[] {
  const out: TrainGear[] = [];
  let cx = x;
  let cy = y;
  links.forEach((l, i) => {
    // Teeth: as close to the radius asked for as the pitch allows, and a multiple of the spokes (so the strip loops).
    const rp0 = pitchRadius({ r: l.r });
    const teeth = Math.max(l.spokes, Math.round((Math.PI * 2 * rp0) / pitch / l.spokes) * l.spokes);
    const rp = (teeth * pitch) / (Math.PI * 2);
    const r = Math.round(rp + Math.max(2, Math.round(rp * 0.1)) / 2);
    let angle = 0;
    if (i > 0) {
      const prev = out[i - 1];
      const a = (l.dir * Math.PI) / 180;
      const dist = pitchRadius(prev) + pitchRadius({ r }) + 0.4;
      cx = prev.x + Math.cos(a) * dist;
      cy = prev.y + Math.sin(a) * dist;
      // Put a gap of this gear where the previous gear has a tooth (or wherever its teeth are at the contact).
      const pp = geometry(prev).pitch;
      const deltaPrev = ((((a - prev.angle) / pp) % 1) + 1) % 1;
      const delta = (((0.5 - deltaPrev) % 1) + 1) % 1;
      angle = a + Math.PI - delta * ((Math.PI * 2) / teeth);
    }
    const g: Gear = { id: `${id}-${i}`, x: Math.round(cx * 2) / 2, y: Math.round(cy * 2) / 2, r, teeth, spokes: l.spokes, style: l.style, metal: l.metal ?? metal, angle, seed: seed + i * 17 };
    out.push({ ...g, train: id, reverse: i % 2 === 1, duration: (teeth / l.spokes) * toothTime });
  });
  return out;
}

export const MID_GEARS: TrainGear[] = [
  // Upper works, left margin: a clock train below the escapement.
  ...train("clock", 312, 128, 4.4, 0.7, [
    { r: 17, dir: 0, spokes: 5, style: "spoked" },
    { r: 10, dir: 55, spokes: 4, style: "solid" },
    { r: 14, dir: 120, spokes: 4, style: "holes" },
  ], 100),
  // Upper works, far right (wide screens): driven off the engine shaft.
  ...train("upper-right", 1068, 212, 5.2, 0.45, [
    { r: 30, dir: 0, spokes: 6, style: "spoked" },
    { r: 18, dir: -60, spokes: 3, style: "holes" },
    { r: 24, dir: 10, spokes: 4, style: "solid" },
    { r: 14, dir: 85, spokes: 3, style: "solid" },
  ], 200),
  // Middle works: left and right margins.
  ...train("mid-left", 316, 512, 5, 0.5, [
    { r: 26, dir: 0, spokes: 6, style: "spoked" },
    { r: 15, dir: 40, spokes: 3, style: "solid" },
    { r: 20, dir: 115, spokes: 4, style: "holes" },
  ], 300),
  ...train("mid-right", 952, 498, 5, 0.42, [
    { r: 28, dir: 0, spokes: 4, style: "holes" },
    { r: 18, dir: 50, spokes: 6, style: "spoked" },
    { r: 12, dir: -20, spokes: 3, style: "solid" },
    { r: 22, dir: 100, spokes: 4, style: "solid" },
  ], 400),
  // Heavy works: big wheels on both sides of the furnace.
  ...train("heavy-left", 470, 742, 7, 0.55, [
    { r: 58, dir: 0, spokes: 6, style: "spoked" },
    { r: 36, dir: 200, spokes: 3, style: "holes" },
    { r: 46, dir: 150, spokes: 4, style: "solid" },
    { r: 24, dir: 250, spokes: 4, style: "solid" },
  ], 500),
  ...train("heavy-right", 830, 756, 7, 0.55, [
    { r: 62, dir: 0, spokes: 6, style: "spoked" },
    { r: 34, dir: -35, spokes: 4, style: "holes" },
    { r: 44, dir: 30, spokes: 4, style: "solid" },
    { r: 26, dir: -70, spokes: 4, style: "solid" },
  ], 600),
  // Below the floor, for tall and narrow screens that scroll further.
  ...train("deep", 560, 960, 7, 0.7, [
    { r: 50, dir: 0, spokes: 4, style: "solid" },
    { r: 40, dir: 10, spokes: 6, style: "spoked" },
    { r: 30, dir: -40, spokes: 3, style: "holes" },
  ], 700, "dark"),
];

// The far layer only shows through the mid layer's opening, so its moving parts are in the middle.
export const FAR_GEARS: TrainGear[] = [
  ...train("far-upper", 600, 150, 7, 1.6, [
    { r: 50, dir: 0, spokes: 6, style: "spoked" },
    { r: 34, dir: 35, spokes: 4, style: "holes" },
    { r: 26, dir: -40, spokes: 3, style: "solid" },
  ], 800, "dark"),
  ...train("far-lower", 470, 470, 7, 1.8, [
    { r: 56, dir: 0, spokes: 5, style: "spoked" },
    { r: 30, dir: -30, spokes: 3, style: "holes" },
  ], 900, "dark"),
];

/** Huge wheels in the haze behind everything (painted whole, they don't turn). */
export const FAR_WHEELS: Gear[] = [
  { id: "w0", x: 430, y: 250, r: 150, teeth: 72, spokes: 8, style: "spoked", metal: "dark", angle: 0.05, seed: 951 },
  { id: "w1", x: 860, y: 420, r: 170, teeth: 84, spokes: 6, style: "holes", metal: "dark", angle: 0.2, seed: 952 },
  { id: "w2", x: 640, y: 760, r: 200, teeth: 96, spokes: 8, style: "spoked", metal: "dark", angle: 0.1, seed: 953 },
];

// ─── The engine beside the hero ────────────────────────────────────────────────
/** Revolution time of the flywheel (seconds). */
export const REV = 7.2;
export const FLYWHEEL: TrainGear = {
  id: "flywheel",
  x: 862,
  y: 150,
  r: 66,
  teeth: 0,
  spokes: 6,
  style: "spoked",
  metal: "bronze",
  angle: 0.26,
  seed: 1001,
  train: "engine",
  reverse: false,
  duration: REV / 6,
};
export const CRANK = { r: 18, rod: 70, cylinderX: 960, cylinderW: 62, cylinderH: 30 };
export const STATUS_LAMP = { x: 925, y: 238 };
export const GOVERNOR = { x: 990, y: 92 };
/** The catwalk the automaton patrols (deck top). */
export const CATWALK = { x0: 744, x1: SCENE_W, y: 268 };
/** Where it stops to oil things: the flywheel's bearing, then the pedestal (both in view beside the hero). */
export const AUTOMATON_STOPS = [908, 800];

// ─── Clockwork (upper left margin) ─────────────────────────────────────────────
export const ESCAPEMENT = { x: 345, y: 84, r: 12, teeth: 15, tick: 1 };
export const ANCHOR = { x: 345, y: 66 };
export const PENDULUM = { x: 345, y: 66, len: 118, swing: 7 };

// ─── Lights ────────────────────────────────────────────────────────────────────
/** Pendant lamps hanging from the top pipe and the walls (x, y = bracket). Every one can be switched off. */
const LAMPS: { id?: string; x: number; y: number; k: number; r: number }[] = [
  { x: 322, y: 34, k: 1.0, r: 190 },
  { x: 560, y: 34, k: 0.8, r: 170 },
  { id: "lamp-engine", x: 786, y: 34, k: 1.1, r: 220 },
  { x: 1010, y: 34, k: 1.0, r: 200 },
  { x: 1188, y: 34, k: 0.9, r: 190 },
  { x: 110, y: 34, k: 0.85, r: 180 },
  { id: "lamp-left", x: 336, y: 226, k: 1.05, r: 180 },
  { id: "lamp-right", x: 946, y: 352, k: 1.05, r: 190 },
  { x: 640, y: 372, k: 0.75, r: 170 },
  { x: 160, y: 380, k: 0.85, r: 180 },
  { x: 1120, y: 380, k: 0.85, r: 180 },
  { x: 304, y: 566, k: 0.95, r: 190 },
  { x: 976, y: 566, k: 0.95, r: 190 },
  { x: 120, y: 566, k: 0.8, r: 170 },
  { x: 1160, y: 566, k: 0.8, r: 170 },
];
export const MID_LAMPS = LAMPS.map((l, i) => ({ ...l, id: l.id ?? `lamp-${i}` }));

export const FURNACE = { x: 640, y: 778, w: 92, h: 56 };
export const FURNACE_LIGHT: LayerLight = { x: 640, y: 790, r: 340, color: [1.6, 0.72, 0.28] };

export function midLights(off: ReadonlySet<string> = new Set()): LayerLight[] {
  return [
    ...MID_LAMPS.filter((l) => !off.has(l.id)).map((l) => ({ id: l.id, x: l.x + LAMP_BULB.dx, y: l.y + LAMP_BULB.dy, r: l.r, color: warm(l.k) })),
    FURNACE_LIGHT,
  ];
}

export const FAR_LAMPS = [
  { x: 470, y: 90 },
  { x: 800, y: 200 },
  { x: 700, y: 330 },
  { x: 430, y: 380 },
  { x: 820, y: 560 },
  { x: 560, y: 640 },
];
export const farLights = (): LayerLight[] => FAR_LAMPS.map((l) => ({ x: l.x, y: l.y, r: 150, color: warm(0.7) }));

/** The near layer is between the viewer and the lamps: lit mostly from behind, so it's dark with warm edges. */
export const nearLights = (): LayerLight[] => [
  { x: 330, y: 260, r: 200, color: warm(0.7) },
  { x: 950, y: 380, r: 200, color: warm(0.7) },
  { x: 330, y: 700, r: 200, color: warm(0.6) },
  { x: 950, y: 760, r: 200, color: warm(0.6) },
  { x: 640, y: 1000, r: 260, color: [1.0, 0.45, 0.18] },
];

// ─── Pipes, gauges, vents ──────────────────────────────────────────────────────
export const TOP_PIPE_Y = 30;
/** Status lamps along the top pipe. */
export const INDICATORS = Array.from({ length: 40 }, (_, i) => ({ x: 4 + i * 32, y: TOP_PIPE_Y + 5 }));

export const GAUGES = [
  { id: "gauge-tap", x: 940, y: 410, r: 10, rest: 7 },
  { id: "gauge-l1", x: 322, y: 440, r: 8, rest: 5 },
  { id: "gauge-l2", x: 352, y: 468, r: 6, rest: 8 },
  { id: "gauge-r2", x: 978, y: 446, r: 7, rest: 6 },
];
export const LEVER = { x: 343, y: 380 };
export const VENTS = [
  { x: 346, y: 366, kind: "valve" as const },
  { x: 600, y: 590, kind: "puff" as const },
  { x: 1028, y: 128, kind: "puff" as const },
  { x: 520, y: 26, kind: "puff" as const },
  { x: 230, y: 620, kind: "puff" as const },
];
/** Lit areas where dust drifts. */
export const MOTES = [
  { x: 280, y: 180, w: 110, h: 120 },
  { x: 900, y: 300, w: 110, h: 140 },
  { x: 560, y: 680, w: 160, h: 110 },
];
