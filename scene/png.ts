// A small PNG encoder for pixel art: always writes an indexed (palette) PNG, which is 2-4x smaller than RGBA for
// this kind of image. Images with more than 256 colors are reduced with median cut, which is close to lossless
// for painted pixel art (the painters only use a few material ramps). No dependencies beyond node:zlib.

import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data.buffer, data.byteOffset, data.length).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Colors as 0xRRGGBBAA; every fully transparent pixel counts as one color. */
const key = (d: Uint8Array, i: number) => (d[i + 3] === 0 ? 0 : ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0);
const channel = (k: number, c: number) => (k >>> (24 - c * 8)) & 255;

/** Median cut: split the most spread-out box of colors until there are `max` boxes; each box's mean is a color. */
function medianCut(colors: Map<number, number>, max: number): number[] {
  type Box = { keys: number[]; axis: number; total: number; weight: number };
  const box = (keys: number[]): Box => {
    let range = -1;
    let axis = 0;
    for (let c = 0; c < 4; c++) {
      let lo = 255;
      let hi = 0;
      for (const k of keys) {
        const v = channel(k, c);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (hi - lo > range) {
        range = hi - lo;
        axis = c;
      }
    }
    const total = keys.reduce((n, k) => n + (colors.get(k) ?? 0), 0);
    // Weight by how many pixels the box covers, so big flat areas keep their exact colors.
    return { keys, axis, total, weight: keys.length < 2 ? 0 : range * Math.sqrt(total) };
  };
  const boxes: Box[] = [box([...colors.keys()])];
  while (boxes.length < max) {
    let pick = -1;
    for (let i = 0; i < boxes.length; i++) if (boxes[i].weight > 0 && (pick < 0 || boxes[i].weight > boxes[pick].weight)) pick = i;
    if (pick < 0) break;
    const b = boxes[pick];
    b.keys.sort((x, y) => channel(x, b.axis) - channel(y, b.axis));
    // Split at the pixel-weighted median.
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < b.keys.length - 1; i++) {
      acc += colors.get(b.keys[i]) ?? 0;
      if (acc >= b.total / 2) {
        cut = i + 1;
        break;
      }
    }
    boxes.splice(pick, 1, box(b.keys.slice(0, cut)), box(b.keys.slice(cut)));
  }
  return boxes.map((b) => {
    if (b.keys.length === 1) return b.keys[0];
    const sum = [0, 0, 0, 0];
    let n = 0;
    for (const k of b.keys) {
      const w = colors.get(k) ?? 0;
      for (let c = 0; c < 4; c++) sum[c] += channel(k, c) * w;
      n += w;
    }
    const [r, g, bl, a] = sum.map((s) => Math.round(s / n));
    return ((r << 24) | (g << 16) | (bl << 8) | a) >>> 0;
  });
}

function nearest(palette: number[], k: number) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    if (p === 0) continue;
    let d = 0;
    for (let c = 0; c < 4; c++) {
      const e = channel(p, c) - channel(k, c);
      d += e * e * (c === 3 ? 2 : 1);
    }
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** `maxColors` below 256 trades exactness for size (fine for hazy, low-contrast art like the far layer). */
export function encodePNG(w: number, h: number, rgba: Uint8Array, maxColors = 256): Buffer {
  const counts = new Map<number, number>();
  for (let i = 0; i < rgba.length; i += 4) {
    const k = key(rgba, i);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  // Transparency stays out of the median cut: it's one exact entry.
  const clear = counts.delete(0) ? 1 : 0;
  const exact = counts.size <= maxColors - clear;
  const palette = exact ? [...counts.keys()] : medianCut(counts, maxColors - clear);
  if (clear) palette.push(0);
  const index = new Map<number, number>();
  if (exact) palette.forEach((k, i) => index.set(k, i));
  else for (const k of counts.keys()) index.set(k, nearest(palette, k));
  if (clear) index.set(0, palette.length - 1);

  const rows = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) {
    rows[y * (w + 1)] = 0; // filter: none (best for palette images)
    for (let x = 0; x < w; x++) rows[y * (w + 1) + 1 + x] = index.get(key(rgba, (y * w + x) * 4)) ?? 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // indexed color
  const plte = Buffer.alloc(palette.length * 3);
  const trns = Buffer.alloc(palette.length);
  palette.forEach((k, i) => {
    plte[i * 3] = channel(k, 0);
    plte[i * 3 + 1] = channel(k, 1);
    plte[i * 3 + 2] = channel(k, 2);
    trns[i] = channel(k, 3);
  });
  const opaque = trns.every((a) => a === 255);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    ...(opaque ? [] : [chunk("tRNS", trns)]),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}
