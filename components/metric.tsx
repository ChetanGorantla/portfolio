import type { Metric } from "@/lib/content";
import { CountUp } from "./count-up";

/** `before → after`, with the "after" value in the ok color. */
export function MetricBlock({ metric, large = false }: { metric: Metric; large?: boolean }) {
  return (
    <div className="mt-4">
      <p className="label">{metric.label}</p>
      <p className={`mt-1 font-mono font-medium ${large ? "text-3xl" : "text-2xl"}`}>
        <span className="text-ink-muted">{metric.before}</span>
        <span aria-hidden="true" className="px-2 text-ink-muted">
          →
        </span>
        <span className="sr-only"> to </span>
        <span className="text-ok">
          <CountUp value={metric.after} />
        </span>
      </p>
    </div>
  );
}

export function OutcomeBlock({ outcome, large = false }: { outcome: string; large?: boolean }) {
  return (
    <div className="mt-4">
      <p className="label">Outcome</p>
      <p className={`mt-1 font-medium text-ink ${large ? "text-lg leading-7" : "text-[15px] leading-6"}`}>{outcome}</p>
    </div>
  );
}
