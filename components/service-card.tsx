import Link from "next/link";
import type { Service } from "@/lib/content";
import { CardMedia } from "./media";
import { MetricBlock, OutcomeBlock } from "./metric";
import { StatusTag } from "./status";

/** Role and org, minus anything that just repeats the title. */
export function subtitle(s: Service) {
  return [...new Set([s.role, s.org])].filter((x) => x && x !== s.title).join(" · ");
}

// The title link stretches over the whole card (after:inset-0), so the card is
// one click target with a short accessible name. Its ::after draws the focus ring.
export const cardClass =
  "group relative flex h-full flex-col rounded-xl border border-border bg-surface transition hover:border-ink-muted/40 hover:shadow-[0_2px_12px_-6px_rgb(29_28_26/0.15)]";

export function CardLink({ service }: { service: Service }) {
  return (
    <Link
      href={`/incidents/${service.slug}`}
      scroll={false}
      className="after:absolute after:-inset-px after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
    >
      {service.title}
      <span className="sr-only">: read incident report</span>
    </Link>
  );
}

export function ReadMore() {
  return (
    <span aria-hidden="true" className="mt-auto pt-5 text-sm font-medium text-accent">
      Read incident report{" "}
      <span className="inline-block transition-transform motion-safe:group-hover:translate-x-0.5">→</span>
    </span>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tech">
      {tags.map((tag) => (
        <li key={tag} className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs leading-5 text-ink-muted">
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function ServiceCard({ service: s }: { service: Service }) {
  const sub = subtitle(s);
  return (
    <article id={s.slug} className={cardClass}>
      {s.media && <CardMedia media={s.media} />}
      <div className={`flex flex-1 flex-col ${s.featured ? "p-6" : "p-5"}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <StatusTag status={s.status} label={s.statusLabel} />
          {s.dates && <span className="font-mono text-xs leading-5 text-ink-muted">{s.dates}</span>}
        </div>
        <h3 className={`mt-4 font-semibold tracking-tight text-ink ${s.featured ? "text-2xl" : "text-lg"}`}>
          <CardLink service={s} />
        </h3>
        {sub && <p className="mt-0.5 text-sm text-ink-muted">{sub}</p>}
        {s.metric ? (
          <MetricBlock metric={s.metric} large={s.featured} />
        ) : (
          s.outcome && <OutcomeBlock outcome={s.outcome} large={s.featured} />
        )}
        <p className="mt-3 text-[15px] leading-6 text-ink">{s.summary}</p>
        <TagList tags={s.tags} />
        <ReadMore />
      </div>
    </article>
  );
}
