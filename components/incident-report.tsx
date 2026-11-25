import Link from "next/link";
import { getNextService, getOrg, type Metric, type Service } from "@/lib/content";
import { ExternalLink } from "./links";
import { Mdx } from "./mdx";
import { ReportMedia } from "./media";
import { Result } from "./metric";
import { TagList, subtitle } from "./services";
import { StatusTag } from "./status";

export const REPORT_TITLE_ID = "incident-title";

// Static class names so Tailwind can see them.
const FIGURE_COLS: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" };

/** The body's `## ` sections in order: the first is the lead ("In short"), the rest fill a two-column grid. */
function sections(body: string) {
  return body
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const end = chunk.includes("\n") ? chunk.indexOf("\n") : chunk.length;
      return { title: chunk.slice(0, end).trim(), md: chunk.slice(end + 1) };
    });
}

/** Shared by the drawer and the full page. `inDrawer` keeps "next" navigation inside the drawer's history entry. */
export function IncidentReport({ service: s, inDrawer = false }: { service: Service; inDrawer?: boolean }) {
  const next = getNextService(s.slug);
  const sub = subtitle(s);
  // A company's own report leads with its logo in place of the name.
  const logo = s.org && s.title === s.org ? getOrg(s.org).logo : null;
  const [lead, ...rest] = sections(s.body);
  const figures: Metric[] = [...(s.metric ? [s.metric] : []), ...s.numbers.map((n) => ({ label: n.label, before: null, after: n.value }))];
  const links = [
    s.links.demo && { label: "Demo", href: s.links.demo },
    s.links.repo && { label: "Repository", href: s.links.repo },
  ].filter((l): l is { label: string; href: string } => Boolean(l));

  return (
    <article className="mx-auto max-w-[44rem]">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 id={REPORT_TITLE_ID} className="text-3xl leading-tight font-semibold tracking-tight text-ink">
              {logo ? (
                // Plain <img>: an SVG gains nothing from the image optimizer.
                <img src={logo.src} alt={s.title} width={160} height={Math.round((160 * logo.height) / logo.width)} className="[image-rendering:auto]" />
              ) : (
                s.title
              )}
            </h1>
            {sub && <p className={logo ? "mt-3 text-lg font-medium text-ink" : "mt-1 text-ink-muted"}>{sub}</p>}
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            {s.dates && <span className="text-sm text-ink-muted">{s.dates}</span>}
            <StatusTag status={s.status} label={s.statusLabel} />
          </div>
        </div>

        {figures.length > 0 && (
          <div className={`sunken mt-5 grid divide-y divide-border sm:divide-x sm:divide-y-0 ${FIGURE_COLS[figures.length] ?? "sm:grid-cols-3"}`}>
            {figures.map((f) => (
              <div key={f.label} className="px-4 py-3.5 sm:px-5">
                <Result metric={f} win={f === s.metric && s.status === "winner"} />
              </div>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <ul className="mt-4 flex gap-3">
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

      {lead && (
        <section className="mt-5">
          <h2 className="kicker">{lead.title}</h2>
          <div className="mt-1.5">
            <Mdx source={lead.md} variant="lead" />
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-border pt-5 sm:grid-cols-2">
          {rest.map((sec) => (
            <section
              key={sec.title}
              className={sec.title.startsWith("What I learned") ? "border-l-[3px] border-accent bg-accent/7 px-4 py-3 sm:-mt-3" : ""}
            >
              <h2 className="kicker text-accent">{sec.title}</h2>
              <div className="mt-1.5">
                <Mdx source={sec.md} variant="report" />
              </div>
            </section>
          ))}
        </div>
      )}

      {s.media && (
        <div className="mt-8">
          <ReportMedia media={s.media} />
        </div>
      )}

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-border pt-4">
        <TagList tags={s.tags} />
        <Link
          href={`/incidents/${next.slug}`}
          replace={inDrawer}
          scroll={!inDrawer}
          className="group ml-auto text-sm font-semibold whitespace-nowrap text-accent"
        >
          Next: {next.title}{" "}
          <span aria-hidden="true" className="inline-block transition-transform motion-safe:group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </footer>
    </article>
  );
}
