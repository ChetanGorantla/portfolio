// Pixel assets for the page itself: the bronze instrument-plate frame (a 9-slice for CSS border-image), the ivory
// face texture, status lamp lenses, and the little labyrinth scene on the 404 page.

import { add, Bitmap, hash, hex, Rng, shade, type RGB } from "./paint.ts";
import { BRONZE, BRONZE_HI, BRONZE_LO, COPPER, finish, flange, IVORY, patinated, plateWall, tube, VERDIGRIS, WARM } from "./kit.ts";

/** Plate frame: SLICE px border, TILE px of edge between corners (tiles seamlessly). */
export const PLATE = { slice: 7, tile: 24 };

/**
 * The bronze rim of an instrument plate: a dark outline, a 4px bevel lit from the top left, an inner groove, rivets
 * in the chamfered corners and a little verdigris. `lit` is the hover state (polished brighter).
 */
export function plateFrame(lit: boolean): Bitmap {
  const { slice: S, tile: T } = PLATE;
  const N = S * 2 + T;
  const b = new Bitmap(N, N);
  const base = lit ? shade(BRONZE, 1.18) : BRONZE;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const inset = Math.min(x, y, N - 1 - x, N - 1 - y);
      if (inset >= S) continue;
      // chamfered corners
      const cx = Math.min(x, N - 1 - x);
      const cy = Math.min(y, N - 1 - y);
      if (cx + cy < 2) continue;
      // the nearest edge decides its light: top/left lit, bottom/right in shadow
      const edges = { left: x, top: y, right: N - 1 - x, bottom: N - 1 - y };
      const side = (Object.keys(edges) as (keyof typeof edges)[]).reduce((a, k) => (edges[k] < edges[a] ? k : a), "top");
      const along = side === "top" || side === "bottom" ? x : y;
      const t = ((along % T) + T) % T; // position along the tile, so edges repeat seamlessly
      const n = hash(t, inset + (side === "top" ? 0 : side === "bottom" ? 9 : side === "left" ? 19 : 29), 5);
      let c: RGB;
      if (inset === 0 || cx + cy === 2) c = hex("#1a120a");
      else if (inset === S - 1) c = hex("#2a1d10"); // groove into the face
      else if (inset === S - 2) c = shade(base, 0.62);
      else {
        const k = side === "top" ? 1.18 : side === "left" ? 1.08 : side === "right" ? 0.78 : 0.7;
        c = shade(base, k * (0.94 + n * 0.12));
        if (inset === 1) c = side === "top" || side === "left" ? add(shade(base, 1.35), 14) : shade(base, 0.55);
        if (n > 0.93 && inset > 1 && inset < S - 2) c = shade(VERDIGRIS[Math.floor(n * 50) % VERDIGRIS.length], 0.95);
      }
      b.set(x, y, c);
    }
  // rivets in the corners
  for (const [rx, ry] of [
    [2, 2],
    [N - 5, 2],
    [2, N - 5],
    [N - 5, N - 5],
  ]) {
    b.set(rx + 1, ry, add(BRONZE_HI, 20));
    b.set(rx, ry + 1, BRONZE_HI);
    b.set(rx + 1, ry + 1, shade(BRONZE_HI, 0.85));
    b.set(rx + 2, ry + 1, BRONZE_LO);
    b.set(rx + 1, ry + 2, shade(BRONZE_LO, 0.7));
  }
  return b;
}

/** A 32×32 tile of ivory enamel with a faint grain (repeats seamlessly). */
export function ivoryTile(): Bitmap {
  const b = new Bitmap(32, 32);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const n = hash(x, y, 3);
      b.set(x, y, n > 0.9 ? add(IVORY, 3) : n < 0.08 ? add(IVORY, -4) : IVORY);
    }
  return b;
}

/** A 7×7 status lamp: bronze bezel, colored glass lens with a hot center and a glint. */
export function lampLens(color: string): Bitmap {
  const b = new Bitmap(7, 7);
  const c = hex(color);
  b.disc(3.5, 3.5, 3.5, (x, y, d) => (d > 0.72 ? shade(BRONZE, y < 3 ? 1.2 : 0.7) : null));
  b.disc(3.5, 3.5, 2.5, (x, y, d) => (d < 0.45 ? add(c, 70) : c));
  b.set(2, 2, [255, 255, 250]);
  return b;
}

// ─── 404: a labyrinth of pipes ─────────────────────────────────────────────────
export const MAZE = { cols: 8, rows: 4, cell: 24, pad: 6 };

/** A maze (seeded depth-first carve), painted as pipes on a riveted wall; returns the scene and a wandering path. */
export function labyrinth(): { b: Bitmap; path: [number, number][] } {
  const { cols, rows, cell, pad } = MAZE;
  const W = cols * cell + pad * 2;
  const H = rows * cell + pad * 2;
  const b = new Bitmap(W, H);
  const r = new Rng(404);
  plateWall(b, r, 0, 0, W, H, undefined, [30, 40]);
  // carve
  const open = new Set<string>(); // "c,r,dir" passages
  const seen = new Set<number>();
  const order: number[] = [];
  const stack = [0];
  seen.add(0);
  order.push(0);
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    const next = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ].filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !seen.has(y * cols + x));
    if (!next.length) {
      stack.pop();
      if (stack.length) order.push(stack[stack.length - 1]);
      continue;
    }
    const [nx, ny] = r.pick(next);
    const n = ny * cols + nx;
    open.add(`${Math.min(cur, n)}-${Math.max(cur, n)}`);
    seen.add(n);
    stack.push(n);
    order.push(n);
  }
  // walls as pipes: every cell edge that isn't a passage
  const pipe = patinated(r.int(1, 1e6), COPPER, 0.55, 6);
  const wall = (x0: number, y0: number, x1: number, y1: number) => tube(b, [[x0, y0], [x1, y1]], 4, pipe, { spec: hex("#ffc9a0") });
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x < cols; x++) {
      const a = (y - 1) * cols + x;
      const c = y * cols + x;
      if (y > 0 && y < rows && open.has(`${a}-${c}`)) continue;
      wall(pad + x * cell, pad + y * cell, pad + (x + 1) * cell, pad + y * cell);
    }
  for (let x = 0; x <= cols; x++)
    for (let y = 0; y < rows; y++) {
      const a = y * cols + x - 1;
      const c = y * cols + x;
      if (x > 0 && x < cols && open.has(`${a}-${c}`)) continue;
      // the way in: a gap in the left wall of the first cell
      if (x === 0 && y === 0) continue;
      wall(pad + x * cell, pad + y * cell, pad + x * cell, pad + (y + 1) * cell);
    }
  for (let x = 0; x <= cols; x++) for (let y = 0; y <= rows; y++) if ((x + y) % 2 === 0) flange(b, pad + x * cell - 1, pad + y * cell, 4, "h", BRONZE);
  finish(b, [{ x: W * 0.3, y: 0, r: 150, color: WARM }, { x: W * 0.85, y: H, r: 120, color: [0.9, 0.5, 0.25] }], [0.34, 0.36, 0.38], 12, 0, 0);
  // The automaton walks the depth-first order: forward into dead ends and back out again, forever lost.
  const path = order.map((i) => [pad + (i % cols) * cell + cell / 2, pad + Math.floor(i / cols) * cell + cell / 2] as [number, number]);
  return { b, path };
}
