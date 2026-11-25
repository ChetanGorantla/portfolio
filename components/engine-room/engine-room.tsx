"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import manifestJson from "@/lib/scene-manifest.json";
import { HEALTH_EVENT, machineryOn, onMachineryChange } from "@/lib/machinery";
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
const AUTO_SPEED = 16; // art px per second

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

/** Start a sprite's idle animation. Gears loop; the escape wheel ticks; the pendulum swings like a pendulum. */
function animate(img: HTMLElement, s: SpriteInfo, px: number): Animation | null {
  const fw = s.fw * px;
  const n = s.frames;
  const ms = s.duration * 1000;
  switch (s.kind) {
    case "spin":
      return s.reverse
        ? img.animate([{ transform: tx(n - 1, fw) }, { transform: `translateX(${fw}px)` }], { duration: ms, iterations: Infinity, easing: `steps(${n}, end)` })
        : img.animate([{ transform: tx(0, fw) }, { transform: tx(n, fw) }], { duration: ms, iterations: Infinity, easing: `steps(${n}, end)` });
    case "tick":
      // a whole tooth in the first fifth of each second, then a pause
      return img.animate([{ transform: tx(0, fw), easing: `steps(${n - 1}, end)` }, { transform: tx(n - 1, fw), offset: 0.18 }, { transform: tx(n - 1, fw) }], { duration: ms, iterations: Infinity });
    case "swing": {
      // frames are evenly spaced in angle, so time them like a pendulum: slow at the ends
      const kf = Array.from({ length: n }, (_, f) => ({ transform: tx(f, fw), offset: Math.asin((2 * f) / (n - 1) - 1) / Math.PI + 0.5, easing: "steps(1, end)" }));
      return img.animate(kf, { duration: ms, iterations: Infinity, direction: "alternate" });
    }
    case "needle":
      return needleIdle(img, s, fw);
    default:
      return null;
  }
}

function needleIdle(img: HTMLElement, s: SpriteInfo, fw: number) {
  const r = s.rest ?? 6;
  const seq = [r, r, r + 1, r, r, r - 1, r, r + 1, r + 1, r];
  return img.animate(
    seq.map((f, i) => ({ transform: tx(f, fw), offset: i / (seq.length - 1), easing: "steps(1, end)" })),
    { duration: s.duration * 1000 + (s.x % 7) * 300, iterations: Infinity },
  );
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: "steam" | "mote";
}

export function EngineRoom() {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [on, setOn] = useState(true);
  const [lampsOff, setLampsOff] = useState<ReadonlySet<string>>(() => new Set());
  const [shown, setShown] = useState(false);
  /** Imperative handles the event handlers in the JSX call into (set up by the main effect). */
  const api = useRef<{ lever: () => void; tapGauge: (id: string) => void; poke: () => void; kick: () => void } | null>(null);

  useEffect(() => {
    const update = () => setView((v) => {
      const n = measure();
      return v && v.vw === n.vw && v.vh === n.vh && v.px === n.px ? v : n;
    });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const sync = () => setOn(machineryOn());
    sync();
    return onMachineryChange(sync);
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

  // ─── The machine: parallax, animations, particles, the automaton ─────────────
  useEffect(() => {
    if (!view || !plan) return;
    const el = root.current!;
    const { px, vw, vh, dpr } = view;
    const fine = !view.light && matchMedia("(pointer: fine)").matches;
    const layerEls = Object.fromEntries([...el.querySelectorAll<HTMLElement>("[data-layer]")].map((n) => [n.dataset.layer, n])) as Record<LayerId, HTMLElement>;
    const left = Math.round(((vw - M.width * px) / 2) * dpr) / dpr;
    const offsets: Record<LayerId, { x: number; y: number }> = { far: { x: 0, y: 0 }, mid: { x: 0, y: 0 }, near: { x: 0, y: 0 } };

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
        const scrollArt = on ? Math.round((window.scrollY * L.rate * fit) / px) : 0;
        const ox = Math.round(mx * DEPTH[L.id]);
        const oy = Math.round(my * DEPTH[L.id]);
        offsets[L.id] = { x: ox, y: oy - scrollArt };
        node.style.transform = `translate3d(${left + ox * px}px, ${(oy - scrollArt) * px}px, 0)`;
      }
    };
    place();

    // Sprite animations, grouped by gear train so scrolling and hovering can speed trains up.
    const sprites = new Map(M.sprites.map((s) => [s.id, s]));
    const anims: { a: Animation; s: SpriteInfo }[] = [];
    const imgOf = new Map<string, HTMLElement>();
    for (const node of el.querySelectorAll<HTMLElement>("[data-sprite]")) {
      const s = sprites.get(node.dataset.sprite!)!;
      const img = node.firstElementChild as HTMLElement;
      imgOf.set(s.id, img);
      if (!on || (view.light && s.layer === "far")) continue;
      const a = animate(img, s, px);
      if (a) anims.push({ a, s });
    }
    const t0 = document.timeline.currentTime;
    for (const { a } of anims) a.startTime = t0; // in step, so meshing teeth stay meshed

    if (!on) {
      place();
      return () => ro.disconnect();
    }

    // ── speed: scrolling feeds the machine, cards wake the trains behind them
    let boost = 0;
    const wake = new Map<string, number>();
    let lastScroll = window.scrollY;
    let lastScrollT = performance.now();
    // Scrolling and the cursor move the layers on the very next frame (no easing, so nothing trails behind).
    let placing = 0;
    const requestPlace = () => {
      if (!placing) placing = requestAnimationFrame(() => {
        placing = 0;
        place();
      });
    };
    const onScroll = () => {
      const now = performance.now();
      const v = Math.abs(window.scrollY - lastScroll) / Math.max(8, now - lastScrollT);
      lastScroll = window.scrollY;
      lastScrollT = now;
      boost = Math.max(boost, Math.min(3, v * 1.6));
      requestPlace();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const rates = new Map<Animation, number>();
    const applyRates = () => {
      for (const { a, s } of anims) {
        // The escapement keeps time: the pendulum, anchor and escape wheel never speed up.
        if (!s.train || s.kind === "swing" || s.kind === "tick") continue;
        const rate = Math.round((1 + boost) * (wake.get(s.train) ?? 1) * 20) / 20;
        if (rates.get(a) !== rate) {
          rates.set(a, rate);
          a.playbackRate = rate;
        }
      }
    };

    const screenBox = (layer: LayerId, x: number, y: number, w: number, h: number) => ({
      x: left + (x + offsets[layer].x) * px,
      y: (y + offsets[layer].y) * px,
      w: w * px,
      h: h * px,
    });
    const gap = (a: DOMRect | { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
      const aw = "width" in a ? a.width : a.w;
      const ah = "height" in a ? a.height : a.h;
      const dx = Math.max(0, b.x - (a.x + aw), a.x - (b.x + b.w));
      const dy = Math.max(0, b.y - (a.y + ah), a.y - (b.y + b.h));
      return Math.hypot(dx, dy);
    };
    let woken: Element | null = null;
    const glowEls = [...el.querySelectorAll<HTMLElement>("[data-glow]")];
    const onOver = (e: PointerEvent) => {
      const card = (e.target as Element).closest?.("[data-wake]");
      if (!card || card === woken) return;
      woken = card;
      const rect = card.getBoundingClientRect();
      for (const t of M.trains) if (gap(rect, screenBox(t.layer, t.box.x, t.box.y, t.box.w, t.box.h)) < 280) wake.set(t.id, 3.2);
      for (const g of glowEls) {
        const gl = g.getBoundingClientRect();
        if (gap(rect, { x: gl.x, y: gl.y, w: gl.width, h: gl.height }) < 260) {
          g.classList.add("is-woken");
          window.setTimeout(() => g.classList.remove("is-woken"), 1400);
        }
      }
    };
    const onOut = (e: PointerEvent) => {
      if (woken && !woken.contains(e.relatedTarget as Node)) woken = null;
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);

    const onMove = (e: PointerEvent) => {
      const ease = (v: number) => Math.sign(v) * Math.abs(v) ** CURVE;
      mx = ease((e.clientX / vw) * 2 - 1);
      my = ease((e.clientY / vh) * 2 - 1);
      requestPlace();
    };
    if (fine && MOUSE_PARALLAX) window.addEventListener("pointermove", onMove, { passive: true });

    // ── particles: steam from vents, dust in the lamplight
    const canvas = el.querySelector<HTMLCanvasElement>("[data-particles]")!;
    const cw = Math.ceil(vw / px);
    const ch = Math.ceil(vh / px);
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = `${cw * px}px`;
    canvas.style.height = `${ch * px}px`;
    const ctx = canvas.getContext("2d")!;
    const parts: Particle[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const puff = (x: number, y: number, n: number, power: number) => {
      for (let i = 0; i < n; i++)
        parts.push({ x: x + rnd(-1, 1), y, vx: rnd(-5, 5) * power, vy: rnd(-26, -12) * power, life: 0, max: rnd(1.6, 3.2) * (power > 1 ? 1.2 : 1), size: 1, kind: "steam" });
    };
    const moteCount = view.light ? 10 : 30;
    const spawnMote = (): Particle => {
      const a = M.motes[Math.floor(Math.random() * M.motes.length)];
      return { x: rnd(a.x, a.x + a.w), y: rnd(a.y, a.y + a.h), vx: rnd(-2.5, 2.5), vy: rnd(-2, 2), life: 0, max: rnd(5, 11), size: 1, kind: "mote" };
    };
    for (let i = 0; i < moteCount; i++) parts.push({ ...spawnMote(), life: rnd(0, 5) });
    const ventTimers = M.vents.filter((v) => v.kind === "puff").map((v) => ({ v, next: performance.now() + rnd(500, 5000) }));

    // ── the automaton
    const bot = el.querySelector<HTMLElement>("[data-bot]");
    const A = M.automaton;
    // It walks on from just past the right edge of the screen (or the scene, whichever is nearer).
    const enter = Math.min(A.path.enter, Math.ceil(M.width / 2 + vw / px / 2 + DEPTH.mid + 4));
    // Its round: walk on, oil each stop in turn, walk back off; back again 12–25 s later (first visit soon after load).
    type Mode = "away" | "in" | "work" | "out" | "startle" | "react" | "flee";
    const st = { mode: "away" as Mode, x: enter, dir: -1, t: 0, stop: 0, next: performance.now() + rnd(2000, 4000), react: "wave" as "wave" | "drop" };
    const showBot = (frame: number) => {
      if (!bot) return;
      bot.style.display = "block";
      bot.style.transform = `translate3d(${Math.round(st.x) * px}px, ${(A.path.y - A.fh + 1) * px}px, 0) scaleX(${st.dir > 0 ? -1 : 1})`;
      bot.style.backgroundPosition = `${-frame * A.fw * px}px 0`;
    };
    const frameOf = (anim: keyof typeof A.anims, t: number, fps: number) => A.anims[anim].start + (Math.floor(t * fps) % A.anims[anim].count);
    const stepBot = (now: number, dt: number) => {
      if (!bot) return;
      st.t += dt;
      switch (st.mode) {
        case "away":
          bot.style.display = "none";
          if (now > st.next) Object.assign(st, { mode: "in", x: enter, dir: -1, t: 0, stop: 0 });
          return;
        case "in": {
          // walking to the next stop, whichever side it's on
          const target = A.path.stops[st.stop];
          st.dir = target < st.x ? -1 : 1;
          st.x += st.dir * AUTO_SPEED * dt;
          if ((st.dir < 0 && st.x <= target) || (st.dir > 0 && st.x >= target)) Object.assign(st, { mode: "work", x: target, dir: -1, t: 0 });
          return showBot(frameOf("walk", st.t, 6));
        }
        case "work":
          if (st.t > 4.2) {
            const more = st.stop + 1 < A.path.stops.length;
            Object.assign(st, more ? { mode: "in", stop: st.stop + 1, t: 0 } : { mode: "out", dir: 1, t: 0 });
          }
          return showBot(st.t < 3.4 ? frameOf("oil", st.t, 3) : A.anims.idle.start);
        case "out":
        case "flee":
          st.x += AUTO_SPEED * dt * (st.mode === "flee" ? 2.6 : 1);
          if (st.x > enter) Object.assign(st, { mode: "away", next: now + rnd(12000, 25000) });
          return showBot(frameOf("walk", st.t, st.mode === "flee" ? 12 : 6));
        case "startle":
          if (st.t > 0.55) Object.assign(st, { mode: "react", t: 0 });
          return showBot(A.anims.startle.start + (st.t < 0.3 ? 0 : 1));
        case "react":
          if (st.t > 1.5) Object.assign(st, { mode: "flee", dir: 1, t: 0 });
          return showBot(st.react === "wave" ? frameOf("wave", st.t, 4) : A.anims.drop.start + Math.min(2, Math.floor(st.t * 5)));
      }
    };

    // ── health check: lamps ripple along the pipe, the status lamp flashes, the engine revs
    const timers: number[] = [];
    const indicators = [...el.querySelectorAll<HTMLElement>("[data-ind]")];
    const statusGlow = el.querySelector<HTMLElement>("[data-status-glow]");
    const onHealth = () => {
      boost = 3;
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

    // ── easter eggs
    api.current = {
      lever: () => {
        const s = sprites.get(M.eggs.lever);
        const img = imgOf.get(M.eggs.lever);
        if (!s || !img) return;
        const fw = s.fw * px;
        const f = [0, 1, 2, 3, 3, 2, 1, 0];
        const at = [0, 0.04, 0.08, 0.12, 0.84, 0.9, 0.95, 1];
        img.animate(f.map((fr, i) => ({ transform: tx(fr, fw), offset: at[i], easing: "steps(1, end)" })), { duration: 1700 });
        puff(M.eggs.vent.x, M.eggs.vent.y, 46, 1.7);
      },
      tapGauge: (id) => {
        const entry = anims.find((x) => x.s.id === id);
        const img = imgOf.get(id);
        if (!entry || !img) return;
        const fw = entry.s.fw * px;
        const r = entry.s.rest ?? 6;
        const seq = [r, 12, 11, 12, 9, 11, 8, r + 2, r, r + 1, r];
        entry.a.pause();
        const tap = img.animate(seq.map((fr, i) => ({ transform: tx(fr, fw), offset: i / (seq.length - 1), easing: "steps(1, end)" })), { duration: 1300 });
        tap.onfinish = () => entry.a.play();
      },
      poke: () => {
        if (st.mode === "in" || st.mode === "work" || st.mode === "out") Object.assign(st, { mode: "startle", t: 0, react: Math.random() < 0.5 ? "wave" : "drop" });
      },
      // a shove on the flywheel: the engine races, then winds back down
      kick: () => {
        wake.set("engine", 7);
        const exhaust = M.vents.find((v) => v.kind === "puff" && v.y < 200 && v.x > M.width / 2);
        if (exhaust) puff(exhaust.x, exhaust.y, 24, 1.4);
      },
    };

    // ── the loop (about 30 fps, stopped while the tab is hidden)
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 32) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      boost = Math.max(0, boost - dt * 1.4);
      for (const [k, v] of wake) {
        if (v <= 1.02) wake.delete(k);
        else wake.set(k, 1 + (v - 1) * Math.pow(0.18, dt));
      }
      applyRates();

      for (const t of ventTimers)
        if (now > t.next) {
          puff(t.v.x, t.v.y, view.light ? 4 : 9, 1);
          t.next = now + rnd(2800, 7000);
        }
      ctx.clearRect(0, 0, cw, ch);
      const ox = left / px + offsets.mid.x;
      const oy = offsets.mid.y;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life > p.max) {
          if (p.kind === "mote") parts[i] = spawnMote();
          else parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const t = p.life / p.max;
        const x = Math.round(p.x + ox);
        const y = Math.round(p.y + oy);
        if (x < -4 || y < -4 || x > cw + 4 || y > ch + 4) continue;
        if (p.kind === "steam") {
          p.vx *= 0.985;
          p.vy *= 0.975;
          const s = 1 + Math.floor(t * 3.2);
          ctx.fillStyle = `rgba(226, 232, 226, ${(0.42 * (1 - t)).toFixed(3)})`;
          ctx.fillRect(x, y, s, s);
        } else {
          const a = Math.sin(t * Math.PI) * 0.55;
          ctx.fillStyle = `rgba(255, 222, 160, ${a.toFixed(3)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      stepBot(now, dt);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    run();
    document.addEventListener("visibilitychange", run);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(placing);
      timers.forEach(clearTimeout);
      for (const { a } of anims) a.cancel();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener(HEALTH_EVENT, onHealth);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("visibilitychange", run);
      ctx.clearRect(0, 0, cw, ch);
      if (bot) bot.style.display = "none";
      api.current = null;
    };
  }, [view, plan, on]);

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
    <div ref={root} className="engine" data-shown={shown || undefined} data-on={on || undefined} aria-hidden="true">
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
                  <img data-lazy={s.src} alt="" decoding="async" style={{ width: s.fw * s.frames * px, height: s.fh * px }} />
                </div>
              ))}
            {plan.glows
              .filter((g) => g.layer === L.id && !(g.lamp && lampsOff.has(g.lamp)))
              .map((g, i) => (
                <span
                  key={i}
                  data-glow=""
                  {...(g.lamp === "status" ? { "data-status-glow": "" } : {})}
                  className={`engine-glow is-${g.kind}`}
                  style={{ ...box(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2), "--c": g.color, animationDelay: `${-(i * 0.37) % 2.4}s` } as CSSProperties}
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
                  .filter((s) => s.id === "flywheel" || s.id === M.eggs.lever || s.kind === "needle")
                  .map((s) => (
                    <Egg
                      key={s.id}
                      title={s.id === "flywheel" ? "Give the flywheel a spin" : s.id === M.eggs.lever ? "Pull the steam valve" : "Tap the gauge"}
                      round={s.id !== M.eggs.lever}
                      style={box(s.x, s.y, s.fw, s.fh)}
                      onClick={() => (s.id === "flywheel" ? api.current?.kick() : s.id === M.eggs.lever ? api.current?.lever() : api.current?.tapGauge(s.id))}
                    />
                  ))}
                {M.lamps.map((l) => (
                  <Egg key={l.id} title={lampsOff.has(l.id) ? "Switch the lamp on" : "Switch the lamp off"} style={box(l.x - 8, l.y + 4, 17, 14)} onClick={() => toggleLamp(l.id)} />
                ))}
                <button
                  type="button"
                  tabIndex={-1}
                  data-bot=""
                  title="Poke the automaton"
                  className="engine-bot"
                  onClick={() => api.current?.poke()}
                  style={{ width: M.automaton.fw * px, height: M.automaton.fh * px, backgroundImage: `url(${M.automaton.src})`, backgroundSize: `auto ${M.automaton.fh * px}px` }}
                />
              </>
            )}
          </div>
        );
      })}
      <canvas data-particles="" className="engine-particles" />
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
