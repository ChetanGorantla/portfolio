// Motion settings for the engine room and the 404 labyrinth. There's no on/off switch: the room never moves on its
// own, and what motion is left (parallax on scroll, a clicked easter egg, the 404 automaton) follows the OS's
// reduced-motion setting.

const QUERY = "(prefers-reduced-motion: reduce)";

/** True when the visitor's OS asks for reduced motion. */
export function reducedMotion(): boolean {
  return matchMedia(QUERY).matches;
}

/** Calls `cb` when the OS setting changes. */
export function onReducedMotionChange(cb: () => void) {
  const mq = matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Ask the engine room to run its health check (the status dot in the header does this). */
export const HEALTH_EVENT = "engine-health";
