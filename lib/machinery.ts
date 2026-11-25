// Whether the engine room's machinery runs. Off by default when the visitor's OS asks for reduced motion; the
// lever in the status bar overrides that either way and remembers the choice.

const KEY = "machinery";
const EVENT = "machinery-change";

export function machineryOn(): boolean {
  const saved = localStorage.getItem(KEY);
  if (saved === "on") return true;
  if (saved === "off") return false;
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setMachinery(on: boolean) {
  localStorage.setItem(KEY, on ? "on" : "off");
  window.dispatchEvent(new Event(EVENT));
}

/** Calls `cb` when the lever is pulled or the OS setting changes (with no saved choice). */
export function onMachineryChange(cb: () => void) {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  window.addEventListener(EVENT, cb);
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    mq.removeEventListener("change", cb);
  };
}

/** Ask the engine room to run its health check (the status dot in the header does this). */
export const HEALTH_EVENT = "engine-health";
