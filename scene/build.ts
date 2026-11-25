// Paints the engine room and writes it out: layer crops, sprite strips, lamp-off overlays, UI pieces and the share
// image background go to public/scene/, and lib/scene-manifest.json tells the page where everything is.
// Runs before `next dev` and `next build` (package.json pre-scripts). Skips the work if nothing in scene/ changed.
//
//   node scene/build.ts          paint if needed
//   node scene/build.ts --force  paint anyway

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Bitmap, type RGB } from "./paint.ts";
import { encodePNG } from "./png.ts";
import { cagedLamp } from "./kit.ts";
import { gearStrip, paintGearWhole, type Gear } from "./gear.ts";
import { AMBIENT, ESCAPEMENT, FAR_GEARS, farLights, FAR_LAMPS, FLYWHEEL, FOG, FURNACE, GAUGES, INDICATORS, LAYERS, LEVELS, MID_GEARS, MID_LAMPS, midLights, MOTES, REV, SCENE_W, CATWALK, AUTOMATON_STOPS, STATUS_LAMP, VENTS, type TrainGear } from "./layout.ts";
import { cropCenter, lightMid, paintFar, paintMidUnlit, paintNear } from "./scene.ts";
import { anchorStrip, AUTOMATON, AUTOMATON_FRAMES, automatonStrip, crankStrip, fireStrip, governorStrip, indicatorLit, leverStrip, needleStrips, pendulumStrip, type Strip } from "./sprites.ts";
import { ivoryTile, labyrinth, lampLens, plateFrame } from "./ui.ts";
import type { GlowInfo, LayerId, SceneManifest, SpriteInfo, TrainInfo } from "./types.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "scene");
const MANIFEST = path.join(ROOT, "lib", "scene-manifest.json");
const CROPS = [512, 832, 1280];
/** Layers are cut into horizontal bands so the page only loads the parts near the screen. */
const TILE = 220;

const sources = readdirSync(path.join(ROOT, "scene"))
  .filter((f) => f.endsWith(".ts"))
  .sort()
  .map((f) => readFileSync(path.join(ROOT, "scene", f)));
const hash = createHash("sha1").update(Buffer.concat(sources)).digest("hex").slice(0, 10);

if (!process.argv.includes("--force") && existsSync(MANIFEST) && existsSync(OUT)) {
  try {
    if (JSON.parse(readFileSync(MANIFEST, "utf8")).hash === hash) {
      console.log(`scene: up to date (${hash})`);
      process.exit(0);
    }
  } catch {
    // repaint
  }
}

const started = Date.now();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let bytes = 0;
const write = (name: string, b: Bitmap, colors = 256) => {
  const png = encodePNG(b.w, b.h, b.toRGBA8(), colors);
  writeFileSync(path.join(OUT, name), png);
  bytes += png.length;
  return `/scene/${name}?v=${hash}`;
};

// ─── Layers ────────────────────────────────────────────────────────────────────
const far = paintFar();
const midUnlit = paintMidUnlit();
const mid = midUnlit.crop(0, 0, midUnlit.w, midUnlit.h);
lightMid(mid);
const near = paintNear();
const layerImages: Record<LayerId, Bitmap> = { far, mid, near };
const layers = (Object.keys(LAYERS) as LayerId[]).map((id) => ({
  id,
  height: LAYERS[id].height,
  rate: LAYERS[id].rate,
  // The far layer is only seen through the mid layer's opening (x 386–896), so one narrow crop does for every screen.
  crops: (id === "far" ? [544] : CROPS).map((w) => {
    const strip = cropCenter(layerImages[id], w);
    const tiles = [];
    for (let y = 0; y < strip.h; y += TILE) {
      const h = Math.min(TILE, strip.h - y);
      tiles.push({ y, h, src: write(`${id}-${w}-${y / TILE}.png`, strip.crop(0, y, w, h), id === "far" ? 48 : id === "near" ? 128 : 256) });
    }
    return { w, tiles };
  }),
}));

// ─── Sprites ───────────────────────────────────────────────────────────────────
const sprites: SpriteInfo[] = [];
const trainBoxes = new Map<string, { layer: LayerId; x0: number; y0: number; x1: number; y1: number }>();
const addToTrain = (train: string, layer: LayerId, x: number, y: number, w: number, h: number) => {
  const t = trainBoxes.get(train) ?? { layer, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  t.x0 = Math.min(t.x0, x);
  t.y0 = Math.min(t.y0, y);
  t.x1 = Math.max(t.x1, x + w);
  t.y1 = Math.max(t.y1, y + h);
  trainBoxes.set(train, t);
};

const lit = { mid: { lights: midLights(), ambient: AMBIENT.mid }, far: { lights: farLights(), ambient: AMBIENT.far } };
function addGear(g: TrainGear, layer: "mid" | "far") {
  const { strip, info } = gearStrip(g, lit[layer].lights, lit[layer].ambient, LEVELS, layer === "far" ? FOG : undefined);
  sprites.push({ id: g.id, layer, x: info.x, y: info.y, fw: info.fw, fh: info.fh, frames: info.frames, src: write(`g-${g.id}.png`, strip, layer === "far" ? 48 : 192), kind: "spin", duration: g.duration, reverse: g.reverse, train: g.train });
  addToTrain(g.train, layer, info.x, info.y, info.fw, info.fh);
}
for (const g of MID_GEARS) addGear(g, "mid");
for (const g of FAR_GEARS) addGear(g, "far");
addGear(FLYWHEEL, "mid");

function addStrip(id: string, s: Strip, kind: SpriteInfo["kind"], duration: number, extra: Partial<SpriteInfo> = {}) {
  sprites.push({ id, layer: "mid", x: s.x, y: s.y, fw: s.fw, fh: s.fh, frames: s.frames, src: write(`s-${id}.png`, s.strip), kind, duration, ...extra });
  if (extra.train) addToTrain(extra.train, "mid", s.x, s.y, s.fw, s.fh);
}
addStrip("crank", crankStrip(), "spin", REV, { train: "engine" });
addStrip("governor", governorStrip(), "spin", 1.1, { train: "engine" });

// Escape wheel: one tooth per period, so a "tick" plays one loop per second.
const escape: Gear = { id: "escape", x: ESCAPEMENT.x, y: ESCAPEMENT.y, r: ESCAPEMENT.r, teeth: ESCAPEMENT.teeth, spokes: ESCAPEMENT.teeth, style: "solid", metal: "bronze", angle: 0, profile: "saw", seed: 77 };
{
  const { strip, info } = gearStrip(escape, lit.mid.lights, lit.mid.ambient, LEVELS);
  sprites.push({ id: "escape", layer: "mid", x: info.x, y: info.y, fw: info.fw, fh: info.fh, frames: info.frames, src: write("g-escape.png", strip), kind: "tick", duration: ESCAPEMENT.tick, train: "clock" });
}
addStrip("anchor", anchorStrip(), "swing", ESCAPEMENT.tick, { train: "clock" });
addStrip("pendulum", pendulumStrip(), "swing", ESCAPEMENT.tick, { train: "clock" });
for (const n of needleStrips()) addStrip(n.id, n, "needle", 2.4, { rest: n.rest });
addStrip("lever", leverStrip(), "still", 0.25);
addStrip("fire", fireStrip(), "spin", 0.72, { train: "furnace" });

const trains: TrainInfo[] = [...trainBoxes].map(([id, t]) => ({ id, layer: t.layer, box: { x: t.x0, y: t.y0, w: t.x1 - t.x0, h: t.y1 - t.y0 } }));

// ─── Lamps you can switch off: the area they light, repainted without them ─────
const lamps = MID_LAMPS.map((l) => {
  const off = new Set([l.id]);
  const x = Math.max(0, Math.floor((l.x - l.r) / 4) * 4);
  const y = Math.max(0, Math.floor((l.y + 12 - l.r) / 4) * 4);
  const w = Math.min(SCENE_W, l.x + l.r) - x;
  const h = Math.min(LAYERS.mid.height, l.y + 12 + l.r) - y;
  const copy = midUnlit.crop(0, 0, midUnlit.w, midUnlit.h);
  cagedLamp(copy, l.x, l.y, true);
  const part = copy.crop(x, y, w, h);
  lightMid(part, off, x, y);
  return { id: l.id, x: l.x, y: l.y, off: { x, y, w, h, src: write(`lamp-${l.id}-off.png`, part) } };
});

// ─── Glows (soft light the runtime adds on top, so lamps flicker) ──────────────
const glows: GlowInfo[] = [
  ...MID_LAMPS.map((l) => ({ layer: "mid" as const, x: l.x + 0.5, y: l.y + 13, r: 30, color: "255 205 130", kind: "flicker" as const, lamp: l.id })),
  { layer: "mid", x: FURNACE.x, y: FURNACE.y, r: 90, color: "255 130 50", kind: "furnace" },
  { layer: "mid", x: STATUS_LAMP.x, y: STATUS_LAMP.y + 4, r: 14, color: "80 240 160", kind: "steady", lamp: "status" },
  ...FAR_LAMPS.map((l) => ({ layer: "far" as const, x: l.x, y: l.y, r: 20, color: "255 200 130", kind: "flicker" as const })),
];

// ─── The automaton, the status-lamp sweep ──────────────────────────────────────
const anims = {} as SceneManifest["automaton"]["anims"];
AUTOMATON_FRAMES.forEach((f, i) => {
  anims[f.name] ??= { start: i, count: 0 };
  anims[f.name].count++;
});
const automaton = { src: write("automaton.png", automatonStrip()), fw: AUTOMATON.w, fh: AUTOMATON.h, anims, path: { y: CATWALK.y, enter: SCENE_W + 4, stops: AUTOMATON_STOPS } };
const indicators = { src: write("indicator.png", indicatorLit()), size: 5, points: INDICATORS.map((p) => ({ x: p.x - 2, y: p.y - 1 })) };

// ─── UI pieces ─────────────────────────────────────────────────────────────────
write("plate.png", plateFrame(false));
write("plate-lit.png", plateFrame(true));
write("ivory.png", ivoryTile());
write("lamp-ok.png", lampLens("#3fe0a0"));
write("lamp-info.png", lampLens("#5a9cff"));
write("lamp-warn.png", lampLens("#ffb43c"));
const maze = labyrinth();
write("labyrinth.png", maze.b);

// ─── Share image background: the engine, whole, at 2x ──────────────────────────
{
  const W = 600;
  const H = 315;
  const x0 = 400;
  const og = new Bitmap(W, H);
  const put = (src: Bitmap, sx: number) => og.blit(src.crop(sx, 0, W, H), 0, 0);
  put(far, x0);
  const still = midUnlit.crop(0, 0, midUnlit.w, H + 40);
  for (const g of [...MID_GEARS, FLYWHEEL]) if (g.y < H + 60) paintGearWhole(still, g);
  lightMid(still);
  put(still, x0);
  put(near, x0);
  // darken the left two thirds for the text, in dithered steps
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = Math.max(0, 1 - x / (W * 0.62));
      const step = Math.round((t * 6 + ((x + y) % 2) * 0.5) ) / 6;
      og.tint(x, y, 1 - step * 0.72);
    }
  const big = new Bitmap(W * 2, H * 2);
  for (let y = 0; y < H * 2; y++) for (let x = 0; x < W * 2; x++) {
    const i = (Math.floor(y / 2) * W + Math.floor(x / 2)) * 4;
    big.set(x, y, [og.data[i], og.data[i + 1], og.data[i + 2]] as RGB);
  }
  write("og.png", big);
}

// ─── Manifest ──────────────────────────────────────────────────────────────────
const manifest: SceneManifest = {
  hash,
  width: SCENE_W,
  layers,
  sprites,
  glows,
  lamps,
  trains,
  indicators,
  vents: VENTS,
  motes: MOTES,
  automaton,
  eggs: { lever: "lever", gauge: GAUGES[0].id, lamps: lamps.map((l) => l.id), vent: { x: VENTS[0].x, y: VENTS[0].y } },
  statusLamp: { x: STATUS_LAMP.x, y: STATUS_LAMP.y + 4 },
  maze: { src: `/scene/labyrinth.png?v=${hash}`, w: maze.b.w, h: maze.b.h, path: maze.path },
};
writeFileSync(MANIFEST, JSON.stringify(manifest));
console.log(`scene: painted ${hash} in ${((Date.now() - started) / 1000).toFixed(1)}s, ${readdirSync(OUT).length} files, ${(bytes / 1024).toFixed(0)} KB`);
