"use client";

import { useEffect, useRef, useState } from "react";
import manifestJson from "@/lib/scene-manifest.json";
import { onReducedMotionChange, reducedMotion } from "@/lib/machinery";
import type { SceneManifest } from "@/scene/types";
import { artPx } from "./engine-room/engine-room";

const M = manifestJson as unknown as SceneManifest;
const SPEED = 14; // art px per second

/** The 404 page's labyrinth of pipes, with the maintenance automaton wandering it, lost. */
export function Labyrinth() {
  const bot = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState<number | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    setPx(artPx());
    const sync = () => setOn(!reducedMotion());
    sync();
    return onReducedMotionChange(sync);
  }, []);

  useEffect(() => {
    const el = bot.current;
    if (!el || !px) return;
    const { path } = M.maze;
    const A = M.automaton;
    const at = ([x, y]: [number, number], face: number) => `translate(${(x - A.fw / 2) * px}px, ${(y - A.fh + 6) * px}px) scaleX(${face})`;
    if (!on) {
      el.style.transform = at(path[0], 1);
      el.style.backgroundPosition = `${-A.anims.idle.start * A.fw * px}px 0`;
      return;
    }
    // Constant speed along the path, one art pixel per step; it turns to face where it's going.
    const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    const frames: Keyframe[] = [];
    let t = 0;
    let face = 1;
    path.forEach((p, i) => {
      if (i === 0) {
        frames.push({ transform: at(p, face), offset: 0 });
        return;
      }
      const prev = path[i - 1];
      const nextFace = p[0] > prev[0] ? -1 : p[0] < prev[0] ? 1 : face;
      if (nextFace !== face) {
        face = nextFace;
        frames.push({ transform: at(prev, face), offset: t / total });
      }
      frames[frames.length - 1].easing = `steps(${Math.max(1, Math.round(lengths[i - 1]))}, end)`;
      t += lengths[i - 1];
      frames.push({ transform: at(p, face), offset: t / total });
    });
    const move = el.animate(frames, { duration: (total / SPEED) * 1000, iterations: Infinity });
    const { start, count } = A.anims.walk;
    const walk = el.animate(
      [{ backgroundPosition: `${-start * A.fw * px}px 0` }, { backgroundPosition: `${-(start + count) * A.fw * px}px 0` }],
      { duration: 650, iterations: Infinity, easing: `steps(${count}, end)` },
    );
    return () => {
      move.cancel();
      walk.cancel();
    };
  }, [px, on]);

  const w = `calc(var(--art) * ${M.maze.w})`;
  const h = `calc(var(--art) * ${M.maze.h})`;
  return (
    <div className="sunken w-fit max-w-full overflow-hidden p-[calc(var(--art)*2)]" aria-hidden="true">
      <div className="relative max-w-full" style={{ width: w, height: h }}>
        <img src={M.maze.src} alt="" className="absolute inset-0 size-full max-w-none [image-rendering:pixelated]" />
        {px && (
          <div
            ref={bot}
            className="absolute left-0 top-0 bg-no-repeat [image-rendering:pixelated]"
            style={{ width: M.automaton.fw * px, height: M.automaton.fh * px, backgroundImage: `url(${M.automaton.src})`, backgroundSize: `auto ${M.automaton.fh * px}px` }}
          />
        )}
      </div>
    </div>
  );
}
