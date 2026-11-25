"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The face in the photo, as fractions of it: hair to collar, stopping above the raised hand. The crop's
 * aspect (in photo pixels) matches the window's 84:100. The src's case must match the file (Vercel is case-sensitive).
 */
const PHOTO = { src: "/media/headshot-3.jpg", w: 3455, h: 4607 };
const CROP = { x: 0.5207, y: 0.2475, w: 0.3612, h: 0.3225 };
/** The window in art pixels (1 art px = 2 CSS px). */
const ART = { w: 84, h: 100 };

/** A bronze ramp, dark to light: the photo is etched into the plate in these. */
const RAMP = ["#120c07", "#22160b", "#382411", "#523617", "#6e4a20", "#8d622c", "#ab7e3b", "#c89c52", "#e1bd76", "#f4dfac"].map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Downsample the face into the window and map it onto the bronze ramp with ordered dithering. */
async function etch(img: HTMLImageElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Not img.naturalWidth: with srcset that's scaled by the chosen density, while drawing uses real pixels.
  const bmp = await createImageBitmap(img);
  const nw = bmp.width;
  const nh = bmp.height;
  ctx.drawImage(bmp, CROP.x * nw, CROP.y * nh, CROP.w * nw, CROP.h * nh, 0, 0, ART.w, ART.h);
  bmp.close();
  const data = ctx.getImageData(0, 0, ART.w, ART.h);
  const d = data.data;
  // Stretch the contrast between the 3rd and 97th percentiles so the face fills the ramp.
  const lum = new Float32Array(ART.w * ART.h);
  for (let i = 0; i < lum.length; i++) lum[i] = Math.pow((0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255, 0.9);
  const sorted = [...lum].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.03)];
  const hi = sorted[Math.floor(sorted.length * 0.97)];
  for (let i = 0; i < lum.length; i++) {
    const x = i % ART.w;
    const y = Math.floor(i / ART.w);
    const t = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo || 1)));
    const k = Math.min(RAMP.length - 1, Math.max(0, Math.round(t * (RAMP.length - 1) + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9)));
    d[i * 4] = RAMP[k][0];
    d[i * 4 + 1] = RAMP[k][1];
    d[i * 4 + 2] = RAMP[k][2];
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return true;
}

/**
 * The inspector's ID plate on the engine: the headshot etched into bronze pixels, with the real photo underneath.
 * Hover, focus or tap the window to see the photo.
 */
export function Portrait({ name, title, stamp }: { name: string; title: string; stamp: string }) {
  const img = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [etched, setEtched] = useState(false);
  const [photo, setPhoto] = useState(false);

  useEffect(() => {
    const i = img.current;
    if (!i) return;
    const run = () => {
      if (canvas.current) etch(i, canvas.current).then(setEtched, () => setEtched(false));
    };
    if (i.complete && i.naturalWidth) run();
    else i.addEventListener("load", run, { once: true });
    return () => i.removeEventListener("load", run);
  }, []);

  return (
    <figure className="plate w-fit flex-none self-start p-[calc(var(--art)*3)]">
      <div
        className="group relative overflow-hidden bg-[#22160b] shadow-[inset_calc(var(--art)*1)_calc(var(--art)*1)_0_rgb(0_0_0/0.5)]"
        style={{ width: `calc(var(--art) * ${ART.w})`, height: `calc(var(--art) * ${ART.h})` }}
      >
        {/* Sized so the crop box fills the window (the photo is mostly wall and shirt). */}
        <Image
          ref={img}
          src={PHOTO.src}
          alt={`Portrait of ${name}`}
          width={PHOTO.w}
          height={PHOTO.h}
          sizes="520px"
          loading="eager"
          fetchPriority="high"
          style={{
            position: "absolute",
            maxWidth: "none",
            width: `${100 / CROP.w}%`,
            height: "auto",
            left: `${(-CROP.x / CROP.w) * 100}%`,
            top: `${((-CROP.y * PHOTO.h) / (CROP.h * PHOTO.h)) * 100}%`,
          }}
        />
        <canvas
          ref={canvas}
          width={ART.w}
          height={ART.h}
          aria-hidden="true"
          className={`absolute inset-0 size-full transition-opacity duration-300 [image-rendering:pixelated] ${
            etched && !photo ? "opacity-100 group-hover:opacity-0 group-has-focus-visible:opacity-0" : "opacity-0"
          }`}
        />
        <button type="button" aria-pressed={photo} onClick={() => setPhoto((p) => !p)} className="absolute inset-0 cursor-pointer">
          <span className="sr-only">Show the color photo</span>
        </button>
      </div>
      <figcaption className="mt-[calc(var(--art)*3)] text-center">
        <span className="label block text-ink-muted">{title}</span>
        <span className="block font-pixel text-[16px] leading-5 text-ink">{stamp}</span>
      </figcaption>
    </figure>
  );
}
