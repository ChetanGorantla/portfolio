import type { Metric } from "@/lib/content";

/**
 * A result: `before → after` with the "after" in the ok color (amber for a win), or a single value, with its label
 * underneath. Used by every dashboard row and column and by the numbers strip at the top of a report.
 */
export function Result({ metric, large = false, win = false }: { metric: Metric; large?: boolean; win?: boolean }) {
  return (
    <div>
      <p className={`leading-tight font-bold tracking-tight whitespace-nowrap tabular-nums ${large ? "text-[26px]" : "text-[22px]"}`}>
        {metric.before && (
          <>
            <span className="font-semibold text-ink-muted/80">{metric.before}</span>
            <span aria-hidden="true" className="px-1.5 font-normal text-ink-muted/80">
              →
            </span>
            <span className="sr-only"> to </span>
          </>
        )}
        <span className={win ? "text-warn" : "text-ok"}>{metric.after}</span>
      </p>
      <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">{metric.label}</p>
    </div>
  );
}
