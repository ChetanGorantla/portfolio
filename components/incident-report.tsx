import Link from "next/link";
import { getNextService, type Service } from "@/lib/content";
import { ExternalLink } from "./links";
import { Mdx } from "./mdx";
import { ReportMedia } from "./media";
import { MetricBlock, OutcomeBlock } from "./metric";
import { TagList, subtitle } from "./service-card";
import { StatusTag } from "./status";

export const REPORT_TITLE_ID = "incident-title";

/** Shared by the drawer and the full page. `inDrawer` keeps "next" navigation inside the drawer's history entry. */
export function IncidentReport({ service: s, inDrawer = false }: { service: Service; inDrawer?: boolean }) {
  const next = getNextService(s.slug);
  const sub = subtitle(s);
  const links = [
    s.links.demo && { label: "Demo", href: s.links.demo },
    s.links.repo && { label: "Repository", href: s.links.repo },
  ].filter((l): l is { label: string; href: string } => Boolean(l));

  return (
    <article className="mx-auto max-w-[70ch]">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <StatusTag status={s.status} label={s.statusLabel} />
          {s.dates && <span className="font-mono text-xs leading-5 text-ink-muted">{s.dates}</span>}
        </div>
        <h1 id={REPORT_TITLE_ID} className="mt-5 text-3xl font-semibold tracking-tight text-ink">
          {s.title}
        </h1>
        {sub && <p className="mt-1 text-ink-muted">{sub}</p>}
        {s.metric ? (
          <MetricBlock metric={s.metric} large />
        ) : (
          s.outcome && <OutcomeBlock outcome={s.outcome} large />
        )}
        <TagList tags={s.tags} />
        {links.length > 0 && (
          <ul className="mt-5 flex gap-3">
            {links.map((l) => (
              <li key={l.label}>
                <ExternalLink
                  href={l.href}
                  className="inline-flex rounded-lg border border-border px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken"
                >
                  {l.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        )}
      </header>

      {s.media && (
        <div className="mt-8">
          <ReportMedia media={s.media} />
        </div>
      )}

      <div className="mt-10 border-t border-border pt-8 text-[16px] text-ink">
        <Mdx source={s.body} variant="report" />
      </div>

      <footer className="mt-12 border-t border-border pt-6">
        <Link
          href={`/incidents/${next.slug}`}
          replace={inDrawer}
          scroll={!inDrawer}
          className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-ink-muted/40"
        >
          <span>
            <span className="label block">Next incident →</span>
            <span className="mt-1 block font-semibold text-ink">{next.title}</span>
          </span>
          <span aria-hidden="true" className="text-accent transition-transform motion-safe:group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </footer>
    </article>
  );
}
