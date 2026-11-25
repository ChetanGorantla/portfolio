"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import manifestJson from "@/lib/scene-manifest.json";
import { HEALTH_EVENT, onReducedMotionChange, reducedMotion } from "@/lib/machinery";
import type { LayerId, LayerInfo, SceneManifest, SpriteInfo } from "@/scene/types";
import "./engine-room.css";

const M = manifestJson as unknown as SceneManifest;

/** How far each layer shifts with the mouse (art px): nearer layers move more. */
const DEPTH: Record<LayerId, number> = { far: 1, mid: 2, near: 4 };
/** Mouse parallax is off for now; set to true to turn it back on. */
const MOUSE_PARALLAX = false;
/** Cursor response: >1 makes small movements near the middle of the window count for less. */
const CURVE = 1.6;
const Z: Record<LayerId, number> = { far: 1, mid: 2, near: 4 };

type View = { vw: number; vh: number; px: number; dpr: number; light: boolean };

/** One art pixel in CSS px: about 2, rounded so it's a whole number of device pixels (crisp at any zoom). */
export function artPx() {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, Math.round(2 * dpr)) / dpr;
}

function measure(): View {
  const vw = document.documentElement.clientWidth;
  return { vw, vh: window.innerHeight, px: artPx(), dpr: window.devicePixelRatio || 1, light: vw < 768 || matchMedia("(pointer: coarse)").matches };
}

const tx = (frame: number, fw: number) => `translateX(${-frame * fw}px)`;

/** The room holds still, so each sprite shows one frame: a pendulum hangs straight down, a gauge needle sits at its reading. */
function restFrame(s: SpriteInfo) {
  if (s.kind === "swing") return Math.floor((s.frames - 1) / 2);
  if (s.kind === "needle") return s.rest ?? 6;
  return 0;
}

/** Play a sprite's frames once (an easter egg), then let it settle back on its resting frame. */
function playOnce(img: HTMLElement, s: SpriteInfo, px: number, frames: number[], duration: number, at?: number[]) {
  const fw = s.fw * px;
  img.animate(
    frames.map((f, i) => ({ transform: tx(f, fw), offset: at ? at[i] : i / (frames.length - 1), easing: "steps(1, end)" })),
    { duration },
  );
}

export function EngineRoom() {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [still, setStill] = useState(false);
  const [lampsOff, setLampsOff] = useState<ReadonlySet<string>>(() => new Set());
  const [shown, setShown] = useState(false);
  /** Imperative handles the event handlers in the JSX call into (set up by the main effect). */
  const api = useRef<{ lever: () => void; tapGauge: (id: string) => void } | null>(null);

  useEffect(() => {
    const update = () => setView((v) => {
      const n = measure();
      return v && v.vw === n.vw && v.vh === n.vh && v.px === n.px ? v : n;
    });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Reduced motion: no parallax and no easter-egg animations; the room is a still picture.
  useEffect(() => {
    const sync = () => setStill(reducedMotion());
    sync();
    return onReducedMotionChange(sync);
  }, []);

  // What this screen needs: the narrowest crop of each layer that covers it, and the sprites inside that width.
  const plan = useMemo(() => {
    if (!view) return null;
    const need = view.vw / view.px + DEPTH.near * 2 + 8;
    const visL = M.width / 2 - need / 2;
    const visR = M.width / 2 + need / 2;
    const inView = (x: number, w: number) => x + w >= visL && x <= visR;
    return {
      crops: Object.fromEntries(M.layers.map((L) => [L.id, L.crops.find((c) => c.w >= need) ?? L.crops[L.crops.length - 1]])) as Record<LayerId, LayerInfo["crops"][number]>,
      sprites: M.sprites.filter((s) => inView(s.x, s.fw)),
      glows: M.glows.filter((g) => inView(g.x - g.r, g.r * 2)),
    };
  }, [view]);

  // Load layer tiles and sprites as they come near the screen; fade the room in once the first ones have arrived.
  // (Rooted on the room itself: it clips its layers, which would cancel a viewport root's margin.)
  useEffect(() => {
    if (!plan) return;
    const el = root.current!;
    let first = true;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        const arriving: Promise<unknown>[] = [];
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const img = e.target as HTMLImageElement;
          img.src = img.dataset.lazy!;
          io.unobserve(img);
          if (first && "tile" in img.dataset) arriving.push(img.decode().catch(() => undefined));
        }
        if (first) {
          first = false;
          Promise.all(arriving).then(() => !cancelled && setShown(true));
        }
      },
      { root: el, rootMargin: "50% 0px" },
    );
    el.querySelectorAll("img[data-lazy]").forEach((n) => io.observe(n));
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [plan]);

  // ─── Parallax on scroll, and the few things a click sets moving (the valve lever, gauges, the health check) ─────
  useEffect(() => {
    if (!view || !plan) return;
    const el = root.current!;
    const { px, vw, vh, dpr } = view;
    const fine = !view.light && matchMedia("(pointer: fine)").matches;
    const layerEls = Object.fromEntries([...el.querySelectorAll<HTMLElement>("[data-layer]")].map((n) => [n.dataset.layer, n])) as Record<LayerId, HTMLElement>;
    const left = Math.round(((vw - M.width * px) / 2) * dpr) / dpr;

    // Long pages scroll the layers more slowly, so their art never runs out.
    let fit = 1;
    const refit = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
      fit = Math.max(0, Math.min(1, ...M.layers.map((L) => (L.height * px - vh) / (L.rate * maxScroll))));
    };
    refit();
    const ro = new ResizeObserver(() => {
      refit();
      place();
    });
    ro.observe(document.body);

    // Cursor position, -1..1 across the window: each layer shifts DEPTH art px with it (nearer layers more).
    let mx = 0;
    let my = 0;
    const place = () => {
      for (const L of M.layers) {
        const node = layerEls[L.id];
        if (!node) continue;
        const scrollArt = still ? 0 : Math.round((window.scrollY * L.rate * fit) / px);
        const ox = Math.round(mx * DEPTH[L.id]);
        const oy = Math.round(my * DEPTH[L.id]);
        node.style.transform = `translate3d(${left + ox * px}px, ${(oy - scrollArt) * px}px, 0)`;
      }
    };
    place();
    if (still) return () => ro.disconnect();

    // Scrolling and the cursor move the layers on the very next frame (no easing, so nothing trails behind).
    let placing = 0;
    const requestPlace = () => {
      if (!placing) placing = requestAnimationFrame(() => {
        placing = 0;
        place();
      });
    };
    window.addEventListener("scroll", requestPlace, { passive: true });

    const onMove = (e: PointerEvent) => {
      const ease = (v: number) => Math.sign(v) * Math.abs(v) ** CURVE;
      mx = ease((e.clientX / vw) * 2 - 1);
      my = ease((e.clientY / vh) * 2 - 1);
      requestPlace();
    };
    if (fine && MOUSE_PARALLAX) window.addEventListener("pointermove", onMove, { passive: true });

    // ── health check: lamps ripple along the pipe and the status lamp flashes
    const timers: number[] = [];
    const indicators = [...el.querySelectorAll<HTMLElement>("[data-ind]")];
    const statusGlow = el.querySelector<HTMLElement>("[data-status-glow]");
    const onHealth = () => {
      indicators.forEach((n, i) => {
        timers.push(window.setTimeout(() => n.classList.add("is-on"), i * 28));
        timers.push(window.setTimeout(() => n.classList.remove("is-on"), i * 28 + 320));
      });
      const end = indicators.length * 28 + 360;
      for (const k of [0, 1]) {
        timers.push(window.setTimeout(() => indicators.forEach((n) => n.classList.add("is-on")), end + k * 360));
        timers.push(window.setTimeout(() => indicators.forEach((n) => n.classList.remove("is-on")), end + k * 360 + 200));
      }
      statusGlow?.classList.remove("is-flashing");
      void statusGlow?.offsetWidth;
      statusGlow?.classList.add("is-flashing");
    };
    window.addEventListener(HEALTH_EVENT, onHealth);

    // ── easter eggs: each moves its part once, when clicked
    const sprites = new Map(M.sprites.map((s) => [s.id, s]));
    const imgOf = (id: string) => el.querySelector<HTMLElement>(`[data-sprite="${id}"] > img`);
    api.current = {
      lever: () => {
        const s = sprites.get(M.eggs.lever);
        const img = imgOf(M.eggs.lever);
        if (s && img) playOnce(img, s, px, [0, 1, 2, 3, 3, 2, 1, 0], 1700, [0, 0.04, 0.08, 0.12, 0.84, 0.9, 0.95, 1]);
      },
      tapGauge: (id) => {
        const s = sprites.get(id);
        const img = imgOf(id);
        const r = s?.rest ?? 6;
        if (s && img) playOnce(img, s, px, [r, 12, 11, 12, 9, 11, 8, r + 2, r, r + 1, r], 1300);
      },
    };

    return () => {
      cancelAnimationFrame(placing);
      timers.forEach(clearTimeout);
      ro.disconnect();
      window.removeEventListener("scroll", requestPlace);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener(HEALTH_EVENT, onHealth);
      api.current = null;
    };
  }, [view, plan, still]);

  if (!view || !plan) return <div ref={root} className="engine" aria-hidden="true" />;
  const { px } = view;
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: x * px, top: y * px, width: w * px, height: h * px });
  const lampRects = M.lamps.filter((l) => lampsOff.has(l.id)).map((l) => l.off);
  const dimmed = (s: SpriteInfo) => s.layer === "mid" && lampRects.some((r) => s.x < r.x + r.w && r.x < s.x + s.fw && s.y < r.y + r.h && r.y < s.y + s.fh);
  const toggleLamp = (id: string) =>
    setLampsOff((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div ref={root} className="engine" data-shown={shown || undefined} aria-hidden="true">
      {M.layers.map((L) => {
        const crop = plan.crops[L.id];
        return (
          <div key={L.id} className="engine-layer" data-layer={L.id} style={{ width: M.width * px, height: L.height * px, zIndex: Z[L.id] }}>
            {crop.tiles.map((t) => (
              <img key={t.y} data-tile="" data-lazy={t.src} className="engine-img" alt="" decoding="async" fetchPriority="low" style={box((M.width - crop.w) / 2, t.y, crop.w, t.h)} />
            ))}
            {L.id === "mid" &&
              M.lamps
                .filter((l) => lampsOff.has(l.id))
                .map((l) => <img key={l.id} className="engine-img engine-lamp-off" src={l.off.src} alt="" style={box(l.off.x, l.off.y, l.off.w, l.off.h)} />)}
            {plan.sprites
              .filter((s) => s.layer === L.id)
              .map((s) => (
                <div key={s.id} data-sprite={s.id} className={`engine-sprite${dimmed(s) ? " is-dim" : ""}`} style={box(s.x, s.y, s.fw, s.fh)}>
                  <img data-lazy={s.src} alt="" decoding="async" style={{ width: s.fw * s.frames * px, height: s.fh * px, transform: tx(restFrame(s), s.fw * px) }} />
                </div>
              ))}
            {plan.glows
              .filter((g) => g.layer === L.id && !(g.lamp && lampsOff.has(g.lamp)))
              .map((g, i) => (
                <span
                  key={i}
                  {...(g.lamp === "status" ? { "data-status-glow": "" } : {})}
                  className="engine-glow"
                  style={{ ...box(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2), "--c": g.color } as CSSProperties}
                />
              ))}
            {L.id === "mid" && (
              <>
                {M.indicators.points.map((p, i) => (
                  <span key={i} data-ind="" className="engine-ind" style={{ ...box(p.x, p.y, M.indicators.size, M.indicators.size), backgroundImage: `url(${M.indicators.src})` }} />
                ))}
                {/* The status lamps along the top pipe, and the big one by the maker's plate: both run a health check. */}
                <Egg title="Run a health check" plain style={box(0, M.indicators.points[0].y - 12, M.width, 18)} onClick={() => window.dispatchEvent(new Event(HEALTH_EVENT))} />
                <Egg title="Run a health check" style={box(M.statusLamp.x - 8, M.statusLamp.y - 14, 17, 22)} onClick={() => window.dispatchEvent(new Event(HEALTH_EVENT))} />
                {plan.sprites
                  .filter((s) => s.id === M.eggs.lever || s.kind === "needle")
                  .map((s) => (
                    <Egg
                      key={s.id}
                      title={s.id === M.eggs.lever ? "Pull the steam valve" : "Tap the gauge"}
                      round={s.id !== M.eggs.lever}
                      style={box(s.x, s.y, s.fw, s.fh)}
                      onClick={() => (s.id === M.eggs.lever ? api.current?.lever() : api.current?.tapGauge(s.id))}
                    />
                  ))}
                {M.lamps.map((l) => (
                  <Egg key={l.id} title={lampsOff.has(l.id) ? "Switch the lamp on" : "Switch the lamp off"} style={box(l.x - 8, l.y + 4, 17, 14)} onClick={() => toggleLamp(l.id)} />
                ))}
              </>
            )}
          </div>
        );
      })}
      <div className="engine-veil" />
    </div>
  );
}

/**
 * An invisible button over part of the machinery, with a tooltip and a faint glow under the cursor so it can be
 * found. The background is decorative, so these are mouse-only and skip the tab order.
 */
function Egg({ title, style, onClick, round = false, plain = false }: { title: string; style: CSSProperties; onClick: () => void; round?: boolean; plain?: boolean }) {
  return <button type="button" tabIndex={-1} title={title} className={`engine-egg${round ? " is-round" : ""}${plain ? " is-plain" : ""}`} style={style} onClick={onClick} />;
}
