"use client";

import { useEffect, useRef } from "react";

const NUMBER = /^(\D*?)(\d+)(.*)$/;
const DURATION = 900;

/**
 * Counts the first number in `value` up from 0 the first time it scrolls into view.
 * The final value reserves the width, so nothing shifts while it counts. Frames
 * write straight to the DOM rather than re-rendering React 60 times a second.
 */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reveal = () => el.setAttribute("data-ready", "");
    const match = value.match(NUMBER);
    // Skip the animation if motion is reduced, or if the CSS fallback has
    // already revealed the final value (late hydration).
    if (!match || matchMedia("(prefers-reduced-motion: reduce)").matches || performance.now() > 1000) {
      reveal();
      return;
    }

    const [, prefix, digits, suffix] = match;
    const target = Number(digits);
    el.textContent = `${prefix}0${suffix}`;
    reveal();

    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        el.textContent = `${prefix}${Math.round(target * (1 - (1 - t) ** 3))}${suffix}`;
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = value;
    };
  }, [value]);

  return (
    <span className="relative inline-block tabular-nums">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="invisible">
        {value}
      </span>
      <span ref={ref} aria-hidden="true" data-countup="" className="absolute inset-0">
        {value}
      </span>
    </span>
  );
}
