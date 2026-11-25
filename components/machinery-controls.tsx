"use client";

import { useEffect, useState } from "react";
import { HEALTH_EVENT, machineryOn, onMachineryChange, setMachinery } from "@/lib/machinery";

/** The status dot: press it and the engine room runs a health check (status lamps sweep along the pipes). */
export function HealthDot() {
  const [pulse, setPulse] = useState(0);
  return (
    <button
      type="button"
      onClick={() => {
        setPulse((p) => p + 1);
        window.dispatchEvent(new Event(HEALTH_EVENT));
      }}
      className="-m-2 flex size-8 flex-none items-center justify-center rounded-md hover:bg-white/5"
      title="Run a health check"
    >
      <span key={pulse} className={`pulse-dot${pulse ? " is-checking" : ""}`} aria-hidden="true" />
      <span className="sr-only">Run a health check</span>
    </button>
  );
}

// 16×16 pixel lever: [x, y, w, h, color]
type Px = [number, number, number, number, string];
const BASE: Px[] = [
  [2, 11, 12, 3, "#9a7442"],
  [2, 11, 12, 1, "#e2bd7a"],
  [2, 13, 12, 1, "#4e3519"],
  [5, 12, 6, 1, "#1a120a"],
];
const UP: Px[] = [
  [7, 10, 1, 2, "#a8b0b0"],
  [6, 8, 1, 2, "#a8b0b0"],
  [5, 6, 1, 2, "#a8b0b0"],
  [3, 3, 3, 3, "#b8382a"],
  [3, 3, 1, 1, "#ff9a86"],
];
const DOWN: Px[] = [
  [8, 10, 1, 2, "#a8b0b0"],
  [9, 9, 1, 2, "#a8b0b0"],
  [10, 8, 1, 2, "#a8b0b0"],
  [10, 5, 3, 3, "#b8382a"],
  [10, 5, 1, 1, "#ff9a86"],
];

/** Stops and starts the engine room's machinery (it remembers; reduced-motion visitors start stopped). */
export function MachineryLever() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    const sync = () => setOn(machineryOn());
    sync();
    return onMachineryChange(sync);
  }, []);
  const running = on ?? true;
  return (
    <button
      type="button"
      onClick={() => setMachinery(!running)}
      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-on-dark-muted transition-colors hover:bg-white/5 hover:text-on-dark"
      title={running ? "Pause the machinery" : "Start the machinery"}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-5" shapeRendering="crispEdges">
        {[...BASE, ...(running ? UP : DOWN)].map(([x, y, w, h, c], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
        ))}
      </svg>
      <span className="label text-inherit max-sm:sr-only">{running ? "Pause" : "Run"}</span>
      <span className="sr-only"> machinery</span>
    </button>
  );
}
