"use client";

import { useState } from "react";
import { HEALTH_EVENT } from "@/lib/machinery";

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
