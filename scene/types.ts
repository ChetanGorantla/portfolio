// What scene/build.ts writes to lib/scene-manifest.json and components/engine-room reads. All positions are in
// art pixels inside a layer (layers are SCENE_W wide and centered on the page); `src` paths are under /scene/.

export type LayerId = "far" | "mid" | "near";

export interface LayerInfo {
  id: LayerId;
  height: number;
  /** Fraction of the page scroll the layer moves (before the runtime scales it to fit long pages). */
  rate: number;
  /**
   * Centered crops of the painted layer, narrowest first: the runtime uses the narrowest that covers the screen. Each
   * is cut into horizontal tiles, loaded as they come near the screen.
   */
  crops: { w: number; tiles: { y: number; h: number; src: string }[] }[];
}

/**
 * How a sprite strip plays:
 * - spin: loops through its frames (gears, flywheel spokes, crank, governor, fire)
 * - tick: an escape wheel, one tooth per tick with a pause between
 * - swing: back and forth (pendulum, anchor)
 * - needle: a gauge needle that twitches near `rest` (the frame index)
 * - still: frame 0 only until something triggers it (lever)
 */
export type SpriteKind = "spin" | "tick" | "swing" | "needle" | "still";

export interface SpriteInfo {
  id: string;
  layer: LayerId;
  x: number;
  y: number;
  fw: number;
  fh: number;
  frames: number;
  src: string;
  kind: SpriteKind;
  /** Seconds per loop (spin, tick: one loop; swing: one way). */
  duration: number;
  reverse?: boolean;
  /** Gear train (or machine) it belongs to: cards wake trains near them. */
  train?: string;
  rest?: number;
}

export interface GlowInfo {
  layer: LayerId;
  x: number;
  y: number;
  r: number;
  color: string;
  /** "flicker" for flames and old bulbs; "steady" otherwise. */
  kind: "flicker" | "steady" | "furnace";
  /** Switchable lamp this glow belongs to. */
  lamp?: string;
}

export interface LampInfo {
  id: string;
  x: number;
  y: number;
  /** Overlay painted with this lamp off (the area its light reached). */
  off: { x: number; y: number; w: number; h: number; src: string };
}

export interface TrainInfo {
  id: string;
  layer: LayerId;
  box: { x: number; y: number; w: number; h: number };
}

export interface AutomatonInfo {
  src: string;
  fw: number;
  fh: number;
  /** Frame ranges in the strip. */
  anims: Record<"walk" | "idle" | "oil" | "startle" | "wave" | "drop", { start: number; count: number }>;
  /** Walks along y (feet) from `enter`, stopping to oil things at each of `stops` in turn, then back out. */
  path: { y: number; enter: number; stops: number[] };
}

export interface SceneManifest {
  hash: string;
  width: number;
  layers: LayerInfo[];
  sprites: SpriteInfo[];
  glows: GlowInfo[];
  lamps: LampInfo[];
  trains: TrainInfo[];
  /** Status lamps along the top pipe that light up in a sweep (health check). */
  indicators: { src: string; size: number; points: { x: number; y: number }[] };
  /** Where steam and dust come from (mid layer). */
  vents: { x: number; y: number; kind: "puff" | "valve" }[];
  motes: { x: number; y: number; w: number; h: number }[];
  automaton: AutomatonInfo;
  eggs: { lever: string; gauge: string; lamps: string[]; vent: { x: number; y: number } };
  /** The big status lamp beside the maker's plate (flashes during a health check). */
  statusLamp: { x: number; y: number };
  /** The 404 page's labyrinth and the path the lost automaton wanders. */
  maze: { src: string; w: number; h: number; path: [number, number][] };
}
