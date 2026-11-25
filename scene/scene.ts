// The three painted layers of the engine room. Everything here is static (fixed parts of gears included); what moves
// is painted by sprites.ts. Layers are painted unlit and lit at the end, like the blog's library.

import { add, Bitmap, fbm, hex, Rng, shade, type RGB } from "./paint.ts";
import {
  BRONZE,
  BRONZE_HI,
  BRONZE_LO,
  cagedLamp,
  castPlate,
  castText,
  COPPER,
  finish,
  flange,
  gauge,
  IRON,
  LAMP,
  patinated,
  plateWall,
  Relief,
  rivet,
  STEEL,
  text5x7Width,
  tube,
  WALL,
} from "./kit.ts";
import { paintGearStatic, paintGearWhole } from "./gear.ts";
import { cabinet, coal, drop, duct, ladder, louver, pipeRun, stencil, tank, toolBoard } from "./clutter.ts";
import {
  AMBIENT,
  CATWALK,
  CRANK,
  ESCAPEMENT,
  FAR_GEARS,
  FAR_LAMPS,
  FAR_WHEELS,
  farLights,
  FLYWHEEL,
  FOG,
  FURNACE,
  GAUGES,
  GOVERNOR,
  INDICATORS,
  LAYERS,
  LEVELS,
  LEVER,
  MAKER_PLATE,
  MID_GEARS,
  MID_LAMPS,
  midLights,
  nearLights,
  OPENING,
  SCENE_W,
  STATUS_LAMP,
  TOP_PIPE_Y,
  VENTS,
} from "./layout.ts";

const W = SCENE_W;

// ─── Shared structure ──────────────────────────────────────────────────────────
/** A riveted I-beam running horizontally (h) or vertically (v). */
function ibeam(b: Bitmap, r: Rng, x: number, y: number, len: number, size: number, dir: "h" | "v", base: RGB = IRON) {
  const tex = fbm(r.int(1, 1e6), 6, 2);
  const flangeW = Math.max(2, Math.round(size / 4));
  for (let a = 0; a < len; a++)
    for (let c = 0; c < size; c++) {
      const px = dir === "h" ? x + a : x + c;
      const py = dir === "h" ? y + c : y + a;
      const isFlange = c < flangeW || c >= size - flangeW;
      let col = shade(base, (isFlange ? 1.05 : 0.72) * (0.9 + tex(px, py) * 0.2));
      if (c === 0) col = add(col, 26);
      if (c === flangeW - 1 || c === size - 1) col = shade(col, 0.6);
      if (c === flangeW && !isFlange) col = shade(col, 0.55); // shadow under the top flange
      b.set(px, py, col);
    }
  for (let a = 6; a < len - 3; a += 12) {
    const px = dir === "h" ? x + a : x + Math.floor(size / 2) - 1;
    const py = dir === "h" ? y + Math.floor(size / 2) - 1 : y + a;
    rivet(b, px, py, add(base, 12));
  }
}

/** Lattice girder (a light truss) running horizontally: two chords and diagonal bracing. */
function truss(b: Bitmap, x0: number, x1: number, y: number, h: number, base: RGB) {
  for (let x = x0; x < x1; x++) {
    b.set(x, y, add(base, 18));
    b.set(x, y + 1, base);
    b.set(x, y + h - 2, base);
    b.set(x, y + h - 1, shade(base, 0.6));
    const k = (((x - x0) % (h * 2)) + h * 2) % (h * 2);
    const dy = k < h ? k : h * 2 - k;
    if (dy > 1 && dy < h - 2) {
      b.set(x, y + dy, shade(base, 0.85));
    }
  }
}

/** A chain hanging straight down: alternating face-on and edge-on links. */
function chain(b: Bitmap, x: number, y0: number, y1: number, base: RGB) {
  for (let y = y0, k = 0; y < y1; y += 4, k++) {
    if (k % 2 === 0) {
      for (let j = 0; j < 6; j++) {
        b.set(x - 1, y + j, j === 0 || j === 5 ? base : add(base, 18));
        b.set(x + 1, y + j, j === 0 || j === 5 ? base : shade(base, 0.6));
      }
      b.set(x, y, add(base, 10));
      b.set(x, y + 5, shade(base, 0.7));
    } else {
      for (let j = 0; j < 6; j++) b.set(x, y + j, j < 2 ? add(base, 24) : base);
    }
  }
}

/** A valve handwheel seen face-on. */
function handwheel(b: Bitmap, cx: number, cy: number, rad: number, base: RGB) {
  b.disc(cx, cy, rad, (x, y, d) => {
    const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
    const spoke = Math.abs(Math.sin(ang * 2)) < 0.28;
    if (d > 0.72 || spoke || d < 0.25) return shade(base, 0.8 + -Math.sin(ang + Math.PI / 4) * 0.3);
    return null;
  });
}

/** Horizontal cylinder (boiler, steam cylinder) with riveted straps. */
function drum(b: Bitmap, r: Rng, x: number, y: number, w: number, h: number, base: RGB, straps: number) {
  const pat = patinated(r.int(1, 1e6), base, 0.45, 9);
  tube(b, [[x + h / 2, y + h / 2], [x + w - h / 2, y + h / 2]], h, pat, { spec: add(base, 90) });
  // flat ends
  for (const ex of [x + h / 2 - 2, x + w - h / 2]) for (let j = 2; j < h - 2; j++) for (let i = 0; i < 3; i++) b.set(ex + i, y + j, shade(base, i === 0 ? 1.1 : 0.7));
  for (let s = 1; s <= straps; s++) {
    const sx = Math.round(x + (w * s) / (straps + 1));
    for (let j = 1; j < h - 1; j++) {
      const t = (j - h / 2) / (h / 2);
      const k = 0.5 + (1 - Math.abs(t + 0.35)) * 0.6;
      b.set(sx, y + j, shade(BRONZE, k * 1.05));
      b.set(sx + 1, y + j, shade(BRONZE, k * 0.8));
      if (j % 5 === 2) rivet(b, sx, y + j, shade(BRONZE, k * 1.2));
    }
  }
}

// ─── Far layer ─────────────────────────────────────────────────────────────────
export function paintFar(): Bitmap {
  const H = LAYERS.far.height;
  const b = new Bitmap(W, H);
  const r = new Rng(2604);
  plateWall(b, r, 0, 0, W, H, WALL.map((c) => shade(c, 0.85)), [70, 110]);
  // distant catwalk trusses
  truss(b, 0, W, 352, 10, shade(IRON, 1.1));
  truss(b, 0, W, 716, 12, shade(IRON, 1.1));
  for (const g of FAR_WHEELS) paintGearWhole(b, g);
  // columns
  for (const x of [520, 742]) ibeam(b, r, x, 0, H, 18, "v", shade(IRON, 1.15));
  for (const g of FAR_GEARS) paintGearStatic(b, g);
  for (const l of FAR_LAMPS) {
    b.rect(l.x - 1, l.y - 6, 1, 5, IRON);
    b.emit(l.x - 1, l.y - 1, LAMP);
    b.emit(l.x, l.y - 1, LAMP);
    b.emit(l.x - 1, l.y, LAMP);
    b.emit(l.x, l.y, hex("#fff2d0"));
  }
  finish(b, farLights(), AMBIENT.far, LEVELS, 0, 0, FOG);
  return b;
}

// ─── Mid layer ─────────────────────────────────────────────────────────────────
/** The mid layer, unlit. Light it with `lightMid` (kept separate so lamps can be relit off). */
export function paintMidUnlit(): Bitmap {
  const H = LAYERS.mid.height;
  const b = new Bitmap(W, H);
  const r = new Rng(1124);
  // Walls where machinery is mounted: the margins, a band under the ceiling, the stoke-hold wall at the bottom.
  // The middle is open: through it (between the cards) you look into the hazy hall of the far layer.
  const O = OPENING;
  plateWall(b, r, 0, 0, O.x0, H);
  plateWall(b, r, O.x1, 0, W - O.x1, H);
  plateWall(b, r, O.x0, 0, O.x1 - O.x0, O.y0);
  plateWall(b, r, O.x0, O.y1, O.x1 - O.x0, H - O.y1);
  // soft shadow just inside the opening's rim, so the hall reads as further back
  for (let y = O.y0; y < O.y1; y++)
    for (let x = O.x0; x < O.x1; x++) {
      const d = Math.min(x - O.x0, O.x1 - 1 - x, y - O.y0, O.y1 - 1 - y);
      if (d < 14) b.set(x, y, [0, 0, 0], Math.round((1 - d / 14) * 4) * 0.11);
    }
  // the bulkhead frame around it
  ibeam(b, r, O.x0 - 10, O.y0 - 6, O.x1 - O.x0 + 20, 16, "h", shade(IRON, 1.05));
  ibeam(b, r, O.x0 - 10, O.y1 - 10, O.x1 - O.x0 + 20, 16, "h", shade(IRON, 1.05));
  for (const x of [O.x0 - 10, O.x1 - 6]) ibeam(b, r, x, O.y0 - 6, O.y1 - O.y0 + 16, 16, "v", shade(IRON, 1.1));

  // Structure: girders framing the margins, a truss under the ceiling, the floor.
  ibeam(b, r, 0, 4, W, 14, "h", shade(IRON, 0.9));
  for (const x of [262, 1020]) ibeam(b, r, x, 18, 820, 14, "v");
  for (const x of [118, 1160]) ibeam(b, r, x, 18, 820, 12, "v", shade(IRON, 0.9));
  truss(b, 0, W, 296, 14, IRON);
  truss(b, 0, W, 560, 12, shade(IRON, 0.95));

  backgroundMachinery(b, r);
  upperWorks(b, r);
  middleWorks(b, r);
  heavyWorks(b, r);

  // Top pipe with the status lamps along it (unlit domes; the runtime lights them in a sweep).
  tube(b, [[-4, TOP_PIPE_Y], [W + 4, TOP_PIPE_Y]], 6, patinated(77, COPPER, 0.5, 8), { spec: hex("#ffc9a0") });
  for (let x = 40; x < W; x += 160) flange(b, x, TOP_PIPE_Y, 6, "h", COPPER);
  for (const p of INDICATORS) {
    b.rect(p.x, p.y - 2, 1, 2, IRON);
    b.disc(p.x + 0.5, p.y + 1.5, 1.6, (x, y) => (y < p.y + 1 ? hex("#3a4a40") : hex("#1d2620")));
  }
  for (const l of MID_LAMPS) cagedLamp(b, l.x, l.y);
  return b;
}

export const lightMid = (b: Bitmap, off: ReadonlySet<string> = new Set(), ox = 0, oy = 0) => finish(b, midLights(off), AMBIENT.mid, LEVELS, ox, oy);

/**
 * The machinery behind the main features: pipe bundles, ducts, cabinets, tanks, vents and stencils, placed by hand
 * zone by zone so the wall is never bare, and densest in the margins wide screens see.
 */
function backgroundMachinery(b: Bitmap, r: Rng) {
  const GREEN = hex("#3d5a4a");
  // ── upper works
  duct(b, r, 380, 58, 380, 22);
  for (const x of [420, 560, 700]) b.rect(x, OPENING.y0, 2, 58 - OPENING.y0, shade(IRON, 1.2)); // hangers
  duct(b, r, 1060, 58, 220, 18, shade(STEEL, 0.5));
  pipeRun(b, r, 0, 300, 104, [{ d: 6, color: COPPER }, { d: 4, color: BRONZE }, { d: 5, color: GREEN, patina: 0.2 }], { valves: 1, gauges: 1 });
  pipeRun(b, r, 372, 790, 100, [{ d: 7, color: BRONZE }, { d: 4, color: COPPER }], { valves: 2 });
  pipeRun(b, r, 1040, 1280, 140, [{ d: 6, color: COPPER }, { d: 6, color: BRONZE }], { valves: 1, gauges: 1 });
  cabinet(b, r, 150, 150, 70, 60);
  cabinet(b, r, 1120, 186, 62, 48);
  tank(b, r, 40, 140, 30, 150, COPPER);
  tank(b, r, 1220, 170, 28, 120, BRONZE);
  toolBoard(b, r, 1150, 74);
  louver(b, 160, 230, 60, 30);
  stencil(b, r, "MIND THE GEARS", 296, 188);
  stencil(b, r, "NO SMOKING", 1092, 252);
  ladder(b, 1236, 186, 268);
  ladder(b, 1100, 268, 300);
  drop(b, r, 760, 108, 296, 5, COPPER);
  drop(b, r, 420, 110, 296, 4, BRONZE);
  // ── middle works
  pipeRun(b, r, 380, 980, 398, [{ d: 4, color: BRONZE }, { d: 6, color: GREEN, patina: 0.2 }], { valves: 2, gauges: 1 });
  pipeRun(b, r, 0, 1280, 462, [{ d: 7, color: COPPER }, { d: 4, color: BRONZE }, { d: 5, color: shade(IRON, 1.6), patina: 0.1 }], { valves: 3, gauges: 2 });
  cabinet(b, r, 150, 400, 66, 54);
  cabinet(b, r, 1070, 430, 70, 60);
  louver(b, 30, 480, 60, 40);
  louver(b, 1190, 470, 60, 44);
  stencil(b, r, "VALVE 7", 212, 360);
  stencil(b, r, "GAUGE BANK B", 1040, 404);
  drop(b, r, 120, 470, 560, 6, COPPER);
  drop(b, r, 1180, 470, 560, 6, BRONZE);
  // ── heavy works
  pipeRun(b, r, 0, 400, 680, [{ d: 8, color: COPPER }, { d: 5, color: BRONZE }], { valves: 1 });
  pipeRun(b, r, 880, 1280, 690, [{ d: 8, color: BRONZE }, { d: 5, color: COPPER }], { valves: 1, gauges: 1 });
  tank(b, r, 160, 700, 40, 136, COPPER);
  tank(b, r, 1090, 690, 44, 146, BRONZE);
  cabinet(b, r, 40, 740, 66, 60);
  cabinet(b, r, 1180, 740, 70, 60);
  stencil(b, r, "STOKE HOLD", 610, 708, hex("#d8b048"));
  stencil(b, r, "NO. 2 BOILER", 590, 668);
  stencil(b, r, "DANGER HIGH PRESSURE", 500, 622, hex("#d8b048"));
  // ── under the floor
  pipeRun(b, r, 0, 1280, 1000, [{ d: 6, color: BRONZE }, { d: 4, color: COPPER }], { valves: 2 });
  duct(b, r, 100, 880, 300, 24, shade(STEEL, 0.45));
  duct(b, r, 860, 900, 360, 24, shade(STEEL, 0.45));
}

function upperWorks(b: Bitmap, r: Rng) {
  // ── Clockwork in the left margin: a movement frame (pillars, arched pierced plate), escape wheel, train.
  const plate = new Relief(290, 50, 90, 128);
  const pt = patinated(r.int(1, 1e6), shade(BRONZE, 0.72), 0.4, 6);
  for (let y = 54; y < 174; y++)
    for (let x = 294; x < 376; x++) {
      // an arched top
      const archY = 54 + (1 - Math.sqrt(Math.max(0, 1 - ((x - 335) / 41) ** 2))) * 18;
      if (y < archY) continue;
      const inset = Math.min(x - 294, 375 - x, y - archY, 173 - y);
      // pierced: arched windows show the wall (and the train) behind
      const inWin = (cx: number, cy: number, w: number, h: number) => Math.abs(x - cx) < w && y > cy - h && y < cy + h && (y > cy - h + w || Math.hypot(x - cx, y - (cy - h + w)) < w);
      if (inset > 2 && (inWin(312, 140, 12, 26) || inWin(362, 132, 7, 22))) continue;
      plate.put(x, y, inset < 2 ? 2 : 1.5, inset < 2 ? shade(BRONZE, 0.95) : pt(x, y));
    }
  // turned pillars at the corners
  for (const px of [298, 371]) for (let y = 60; y < 178; y++) for (let i = -2; i <= 2; i++) plate.put(px + i, y, 3, shade(BRONZE, 1.15 - (i + 2) * 0.12 + (y % 14 < 2 ? 0.2 : 0)));
  plate.bake(b);
  for (const [x, y] of [
    [297, 62],
    [370, 62],
    [297, 168],
    [370, 168],
  ])
    rivet(b, x, y, BRONZE_HI, true);
  paintGearStatic(b, { id: "esc", x: ESCAPEMENT.x, y: ESCAPEMENT.y, r: ESCAPEMENT.r, teeth: ESCAPEMENT.teeth, spokes: ESCAPEMENT.teeth, style: "solid", metal: "bronze", angle: 0, profile: "saw", seed: 77 });
  for (const g of MID_GEARS.filter((g) => g.train === "clock")) paintGearStatic(b, g);

  // ── Catwalk (behind the engine that stands on it): deck, lattice below, handrail with posts
  const C = CATWALK;
  for (let x = C.x0; x < C.x1; x++) {
    b.set(x, C.y, add(IRON, 34));
    b.set(x, C.y + 1, add(IRON, 12));
    b.set(x, C.y + 2, IRON);
    b.set(x, C.y + 3, shade(IRON, 0.6));
    if ((x - C.x0) % 6 < 3) b.set(x, C.y + 4 + ((x - C.x0) % 6), shade(IRON, 0.8));
    else b.set(x, C.y + 4 + (6 - ((x - C.x0) % 6)), shade(IRON, 0.8));
    b.set(x, C.y + 9, shade(IRON, 0.9));
    // handrail
    b.set(x, C.y - 15, add(BRONZE, 30));
    b.set(x, C.y - 14, shade(BRONZE, 0.7));
    b.set(x, C.y - 8, shade(IRON, 1.2));
  }
  for (let x = C.x0 + 2; x < C.x1; x += 22) {
    b.rect(x, C.y - 15, 2, 15, IRON);
    b.rect(x, C.y - 15, 1, 15, add(IRON, 26));
  }


  // ── The engine: pedestal behind the flywheel, flywheel, cylinder, governor.
  const F = FLYWHEEL;
  const ped = new Relief(F.x - 50, F.y - 10, 100, 130);
  const pp = patinated(r.int(1, 1e6), shade(BRONZE, 0.85), 0.4, 7);
  for (let y = F.y; y < CATWALK.y; y++) {
    const t = (y - F.y) / (CATWALK.y - F.y);
    const spread = 6 + t * 34;
    const legW = 5 + t * 3;
    for (let x = Math.floor(F.x - spread - legW); x <= F.x + spread + legW; x++) {
      const dl = Math.abs(x - (F.x - spread));
      const dr = Math.abs(x - (F.x + spread));
      if (dl < legW / 2 || dr < legW / 2) ped.put(x, y, 2, pp(x, y));
    }
  }
  // base block under the plate
  for (let y = CATWALK.y - 8; y < CATWALK.y; y++) for (let x = F.x - 52; x <= F.x + 52; x++) ped.put(x, y, 2.5, shade(BRONZE, 0.75));
  ped.bake(b);
  paintGearStatic(b, F);
  // bearing block and the crank disc's boss on the hub
  b.rect(F.x - 6, F.y - 4, 12, 8, shade(BRONZE, 0.9));
  b.rect(F.x - 6, F.y - 4, 12, 1, BRONZE_HI);
  b.rect(F.x - 6, F.y + 3, 12, 1, BRONZE_LO);

  // crosshead guides and the cylinder
  const axle = F.y;
  for (let x = F.x + CRANK.rod - CRANK.r - 6; x < CRANK.cylinderX; x++) {
    b.set(x, axle - 6, add(STEEL, 10));
    b.set(x, axle - 5, shade(STEEL, 0.6));
    b.set(x, axle + 5, add(STEEL, 0));
    b.set(x, axle + 6, shade(STEEL, 0.5));
  }
  drum(b, r, CRANK.cylinderX, axle - CRANK.cylinderH / 2, CRANK.cylinderW, CRANK.cylinderH, COPPER, 2);
  // valve chest on top, steam pipe up to the main pipe, governor column
  const vc = new Relief(CRANK.cylinderX + 12, axle - 30, 40, 16);
  for (let y = axle - 28; y < axle - 15; y++) for (let x = CRANK.cylinderX + 14; x < CRANK.cylinderX + 48; x++) vc.put(x, y, 2, patinated(91, BRONZE, 0.4)(x, y));
  vc.bake(b);
  tube(b, [[CRANK.cylinderX + 40, axle - 28], [CRANK.cylinderX + 40, TOP_PIPE_Y]], 6, patinated(93, COPPER, 0.4), { spec: hex("#ffc9a0") });
  flange(b, CRANK.cylinderX + 40, 70, 6, "v", COPPER);
  b.rect(GOVERNOR.x - 1, GOVERNOR.y + 14, 3, axle - 28 - GOVERNOR.y - 14, STEEL);
  b.rect(GOVERNOR.x - 1, GOVERNOR.y + 14, 1, axle - 28 - GOVERNOR.y - 14, add(STEEL, 30));
  b.rect(GOVERNOR.x - 4, axle - 32, 9, 4, BRONZE);

  // maker's plate on the base, the status lamp beside it
  const M = MAKER_PLATE;
  castPlate(b, r, M.x, M.y, M.w, M.h);
  M.lines.forEach((line, i) => castText(b, line, M.x + Math.round((M.w - text5x7Width(line)) / 2), M.y + 5 + i * 10, hex("#f0cf8c")));
  b.rect(STATUS_LAMP.x - 1, STATUS_LAMP.y - 10, 2, 10, IRON);
  b.rect(STATUS_LAMP.x - 4, STATUS_LAMP.y - 2, 8, 2, BRONZE);
  b.disc(STATUS_LAMP.x, STATUS_LAMP.y + 4, 4.5, (x, y, d) => (d > 0.8 ? shade(BRONZE, 0.8) : null));
  b.disc(STATUS_LAMP.x, STATUS_LAMP.y + 4, 3.6, () => hex("#3dd88f"));
  for (let y = STATUS_LAMP.y; y < STATUS_LAMP.y + 9; y++) for (let x = STATUS_LAMP.x - 4; x < STATUS_LAMP.x + 5; x++) if (Math.hypot(x + 0.5 - STATUS_LAMP.x, y + 0.5 - STATUS_LAMP.y - 4) < 3.6) b.emit(x, y, Math.hypot(x + 0.5 - STATUS_LAMP.x + 1, y + 0.5 - STATUS_LAMP.y - 3) < 1.6 ? hex("#c8ffe4") : hex("#46e39a"));

  for (const g of MID_GEARS.filter((g) => g.train === "upper-right")) paintGearStatic(b, g);
}

function middleWorks(b: Bitmap, r: Rng) {
  const cop = patinated(r.int(1, 1e6), COPPER, 0.5, 8);
  const brz = patinated(r.int(1, 1e6), BRONZE, 0.45, 8);
  // Two long pipes behind the cards, dropping down into the margins.
  tube(b, [[-4, 334], [300, 334], [300, 420], [380, 420]], 8, cop, { spec: hex("#ffc9a0") });
  tube(b, [[380, 334], [900, 334], [990, 334], [990, 420], [1284, 420]], 8, cop, { spec: hex("#ffc9a0") });
  tube(b, [[-4, 350], [1284, 350]], 5, brz, { spec: hex("#fff0c0") });
  for (const x of [80, 380, 520, 760, 900, 1160]) flange(b, x, 334, 8, "h", COPPER);
  for (const x of [200, 640, 1080]) flange(b, x, 350, 5, "h", BRONZE);
  handwheel(b, 520, 324, 6, BRONZE);
  handwheel(b, 760, 324, 5, shade(BRONZE, 0.9));
  // A third pipe lower down, with a tee into the boiler.
  tube(b, [[-4, 530], [420, 530], [420, 590]], 6, brz, { spec: hex("#fff0c0") });
  tube(b, [[1284, 536], [860, 536], [860, 590]], 6, cop, { spec: hex("#ffc9a0") });

  // Left margin: the steam valve (its lever is a sprite) and a vertical feed pipe.
  tube(b, [[LEVER.x, 334], [LEVER.x, 460]], 6, cop, { spec: hex("#ffc9a0") });
  const vb = new Relief(LEVER.x - 7, LEVER.y - 6, 15, 14);
  for (let y = LEVER.y - 5; y < LEVER.y + 7; y++) for (let x = LEVER.x - 6; x < LEVER.x + 7; x++) if (Math.abs(x - LEVER.x) + Math.abs(y - LEVER.y - 1) * 0.6 < 7) vb.put(x, y, 2.5, shade(BRONZE, 1.0));
  vb.bake(b);
  // vent nozzle above it
  b.rect(VENTS[0].x - 1, VENTS[0].y, 3, LEVER.y - 6 - VENTS[0].y, STEEL);
  b.rect(VENTS[0].x - 2, VENTS[0].y, 5, 2, shade(BRONZE, 1.1));

  for (const gg of GAUGES) {
    // gauge stems down to the pipes
    b.rect(gg.x, gg.y + gg.r + 2, 2, 8, STEEL);
    gauge(b, r, gg.x, gg.y, gg.r);
  }
  for (const g of MID_GEARS.filter((g) => g.train === "mid-left" || g.train === "mid-right")) paintGearStatic(b, g);
}

function heavyWorks(b: Bitmap, r: Rng) {
  // Boiler drum across the middle, with a sight glass and a safety valve (steam puffs from it).
  drum(b, r, 420, 600, 440, 58, COPPER, 5);
  b.rect(596, 588, 9, 13, shade(BRONZE, 0.9));
  b.rect(596, 588, 9, 1, BRONZE_HI);
  b.rect(599, 584, 3, 4, STEEL);
  // sight glass with water level
  b.rect(700, 606, 6, 30, shade(BRONZE, 0.8));
  for (let y = 608; y < 634; y++) b.set(702, y, y > 620 ? hex("#2f6f78") : hex("#a8c8c8"));
  for (let y = 608; y < 634; y++) b.set(703, y, y > 620 ? hex("#3f8f98") : hex("#d0e8e8"));

  for (const g of MID_GEARS.filter((g) => g.train === "heavy-left" || g.train === "heavy-right")) paintGearStatic(b, g);

  // Furnace: iron firebox with brick surround and an open firedoor (the fire is a sprite behind the grate).
  const F = FURNACE;
  const fx = F.x - F.w / 2;
  const fy = F.y - F.h / 2;
  const brick = [hex("#5a3428"), hex("#633a2c"), hex("#4e2e24"), hex("#6a3c2c")];
  for (let y = fy - 18; y < fy + F.h + 6; y++)
    for (let x = fx - 22; x < fx + F.w + 22; x++) {
      const row = Math.floor((y - fy) / 5);
      const off = row % 2 ? 6 : 0;
      const mortar = (y - fy) % 5 === 0 || (x + off - fx) % 12 === 0;
      b.set(x, y, mortar ? hex("#241c18") : shade(brick[(row * 7 + Math.floor((x + off) / 12)) % 4], 0.85 + r.range(0, 0.15)));
    }
  // the flue up into the boiler
  tube(b, [[F.x, fy - 18], [F.x, 656]], 20, patinated(r.int(1, 1e6), shade(IRON, 1.5), 0.2, 6), { spec: shade(STEEL, 1.1) });
  for (const y of [fy - 26, 670]) flange(b, F.x, y, 20, "v", shade(IRON, 1.6));
  const box = new Relief(fx - 4, fy - 4, F.w + 8, F.h + 8);
  for (let y = fy - 2; y < fy + F.h + 2; y++)
    for (let x = fx - 2; x < fx + F.w + 2; x++) {
      const edge = x < fx + 4 || x >= fx + F.w - 4 || y < fy + 4 || y >= fy + F.h - 4;
      if (edge) box.put(x, y, 3, shade(IRON, 1.3));
    }
  box.bake(b);
  // the opening: deep black behind the fire, a grate across the bottom
  b.rect(fx + 4, fy + 4, F.w - 8, F.h - 8, hex("#120806"));
  for (let x = fx + 4; x < fx + F.w - 4; x += 4) b.rect(x, fy + F.h - 14, 2, 10, shade(IRON, 0.9));
  for (const [x, y] of [
    [fx - 1, fy - 1],
    [fx + F.w - 1, fy - 1],
    [fx - 1, fy + F.h - 1],
    [fx + F.w - 1, fy + F.h - 1],
  ])
    rivet(b, x, y, add(IRON, 40), true);

  coal(b, r, fx - 70, 835, 46);
  coal(b, r, fx + F.w + 26, 835, 30);
  // Floor at 836: tread plate, then the space below with a dark gear train.
  for (let y = 836; y < 850; y++)
    for (let x = 0; x < W; x++) {
      let c = shade(IRON, 1.15);
      if (y === 836) c = add(c, 30);
      else if ((x + (y % 4 < 2 ? 0 : 3)) % 6 === 0 && y < 846) c = add(c, 18);
      if (y > 846) c = shade(IRON, 0.6);
      b.set(x, y, c);
    }
  for (let y = 850; y < LAYERS.mid.height; y++) for (let x = 0; x < W; x++) b.tint(x, y, 0.62);
  ibeam(b, r, 0, 852, W, 12, "h", shade(IRON, 0.8));
  for (const g of MID_GEARS.filter((g) => g.train === "deep")) paintGearStatic(b, g);
  tube(b, [[-4, 1040], [1284, 1040]], 10, patinated(55, COPPER, 0.6), { spec: hex("#ffc9a0") });
}

// ─── Near layer (transparent: only pipes, chains and beams) ─────────────────────
export function paintNear(): Bitmap {
  const H = LAYERS.near.height;
  const b = new Bitmap(W, H);
  const r = new Rng(3301);
  const cop = patinated(r.int(1, 1e6), shade(COPPER, 0.85), 0.55, 9);
  const brz = patinated(r.int(1, 1e6), shade(BRONZE, 0.8), 0.5, 9);
  // big vertical pipes framing the outer edges of the margins (clear of the engine and the catwalk), thinner
  // ones further out for wide screens
  tube(b, [[286, -4], [286, H + 4]], 12, brz, { spec: hex("#ffe2a8") });
  tube(b, [[996, -4], [996, H + 4]], 12, cop, { spec: hex("#ffc9a0") });
  tube(b, [[236, -4], [236, 520], [190, 520], [190, H + 4]], 7, cop, { spec: hex("#ffc9a0") });
  tube(b, [[1046, -4], [1046, 760], [1092, 760], [1092, H + 4]], 7, brz, { spec: hex("#ffe2a8") });
  for (let y = 90; y < H; y += 170) {
    flange(b, 286, y, 12, "v", BRONZE);
    flange(b, 996, y + 60, 12, "v", COPPER);
  }
  chain(b, 312, 0, 236, shade(IRON, 1.4));
  // pulley block at the end of the chain
  b.rect(308, 236, 9, 12, shade(IRON, 1.2));
  b.disc(312.5, 242, 3, shade(BRONZE, 0.9));
  chain(b, 972, 0, 330, shade(IRON, 1.4));
  b.rect(969, 330, 7, 4, shade(IRON, 1.3));
  for (let j = 0; j < 7; j++) b.set(972 + (j > 3 ? j - 3 : 0), 334 + j, shade(IRON, 1.3)); // hook
  for (const y of [430, 910, 1310]) ibeam(b, r, 0, y, W, 12, "h", shade(IRON, 0.85));
  finish(b, nearLights(), AMBIENT.near, LEVELS, 0, 0);
  return b;
}

/** Crop a centered strip `w` wide out of a layer. */
export function cropCenter(b: Bitmap, w: number): Bitmap {
  return b.crop(Math.round((b.w - w) / 2), 0, w, b.h);
}

