import type { Service } from "@/lib/content";
import { OutcomeBlock } from "./metric";
import { CardLink, ReadMore, TagList, cardClass, subtitle } from "./service-card";
import { StatusTag } from "./status";

/** "100+ engineers" → the number on top in mono, the rest as a small label. */
function MiniStat({ stat }: { stat: string }) {
  const match = stat.match(/^(\S+)\s+(.*)$/);
  return (
    <li className="font-mono">
      <span className="block text-xl font-medium text-ink">{match ? match[1] : stat}</span>
      <span className="mt-0.5 block text-xs leading-5 text-ink-muted">{match ? match[2] : ""}</span>
    </li>
  );
}

/** The full-width Engineering Chair card: outcome, mini-stats, and the runbook index. */
export function RunbookCard({ service: s }: { service: Service }) {
  const sub = subtitle(s);
  return (
    <article id={s.slug} className={cardClass}>
      <div className="grid flex-1 gap-8 p-6 lg:grid-cols-[1.35fr_1fr] lg:p-8">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <StatusTag status={s.status} label={s.statusLabel} />
            {s.dates && <span className="font-mono text-xs leading-5 text-ink-muted">{s.dates}</span>}
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            <CardLink service={s} />
          </h3>
          {sub && <p className="mt-0.5 text-sm text-ink-muted">{sub}</p>}
          {s.outcome && <OutcomeBlock outcome={s.outcome} large />}
          {s.stats.length > 0 && (
            <ul className="mt-5 grid grid-cols-3 gap-4 border-y border-border py-4" aria-label="Key numbers">
              {s.stats.map((stat) => (
                <MiniStat key={stat} stat={stat} />
              ))}
            </ul>
          )}
          <p className="mt-4 text-[15px] leading-6 text-ink">{s.summary}</p>
          <TagList tags={s.tags} />
          <ReadMore />
        </div>

        {s.runbooks.length > 0 && (
          <div className="self-start rounded-lg border border-border bg-bg p-5">
            <p className="label">Runbook index</p>
            <ol className="mt-3 divide-y divide-border">
              {s.runbooks.map((rb) => (
                <li key={rb.id} className="flex gap-3 py-2.5 text-[15px] leading-6 first:pt-1 last:pb-0">
                  <span className="pt-px font-mono text-xs leading-6 text-ink-muted">{rb.id}</span>
                  <span className="text-ink">{rb.title}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </article>
  );
}
