import Link from "next/link";
import type { ReactNode } from "react";
import { GROUPS, getOrg, reportHref, type Group, type Org, type Service } from "@/lib/content";
import { ExternalLink } from "./links";
import { Result } from "./metric";
import { CurrentTag, isCurrent } from "./status";

/** Role and org, minus anything that just repeats the title (the report header's subtitle). */
export function subtitle(s: Service) {
  return [...new Set([s.role, s.org])].filter((x) => x && x !== s.title).join(" · ");
}

export function TagList({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Tech">
      {tags.map((tag) => (
        <li key={tag} className="bg-surface-sunken px-2 text-xs leading-5 font-medium text-ink-muted">
          {tag}
        </li>
      ))}
    </ul>
  );
}

/**
 * The report link. Its ::after stretches over the whole row or column (which is `relative`), so each one is a single
 * click target with a short accessible name; the ::after also draws the focus ring.
 */
function ReportLink({ service, children }: { service: Service; children: ReactNode }) {
  return (
    <Link
      href={reportHref(service)}
      scroll={false}
      className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
    >
      {children}
      <span className="sr-only">: read the {service.title} report</span>
    </Link>
  );
}

function ReadMore() {
  return (
    <span aria-hidden="true" className="text-[13px] font-semibold whitespace-nowrap text-accent">
      Read report <span className="inline-block transition-transform motion-safe:group-hover:translate-x-0.5">→</span>
    </span>
  );
}

function Section({ group, children }: { group: Group; children: ReactNode }) {
  const { anchor, label } = GROUPS.find((g) => g.id === group)!;
  return (
    <section id={anchor} aria-labelledby={`${anchor}-heading`} className="mt-8">
      <h2 id={`${anchor}-heading`} className="label label-tag">
        {label}
      </h2>
      {children}
    </section>
  );
}

const rowText = "text-[14.5px] leading-normal text-ink/85";

/**
 * The org column: its wordmark logo, or its name and one-line note under its mark. On wide screens it sticks below the
 * header while its roles scroll past, so a role never shows without its company. (Narrow screens name the company in
 * each role's date line instead.)
 */
function OrgName({ org }: { org: Org }) {
  return (
    <h3 className="pt-5 md:sticky md:top-[3.25rem] md:self-start md:py-6">
      {org.logo ? (
        // Plain <img>: a logo this small gains nothing from the image optimizer.
        <img src={org.logo.src} alt={org.name} width={150} height={Math.round((150 * org.logo.height) / org.logo.width)} className="[image-rendering:auto]" />
      ) : (
        <>
          {org.mark && (
            // Decorative: the name is right below it.
            <img src={org.mark.src} alt="" width={52} height={Math.round((52 * org.mark.height) / org.mark.width)} className="mb-3 [image-rendering:auto]" />
          )}
          <span className="block text-[17px] leading-tight font-bold tracking-tight text-ink">{org.name}</span>
          {org.note && <span className="mt-1 block text-[12.5px] leading-snug font-normal text-ink-muted">{org.note}</span>}
        </>
      )}
    </h3>
  );
}

/** "Role · Team" from the role (split on " · "), plus the title when it isn't just the org's name. */
function roleParts(s: Service) {
  const parts = (s.role ?? s.title).split(" · ");
  if (s.title !== s.org && s.title !== s.role) parts.push(s.title);
  return parts;
}

function Row({ service: s }: { service: Service }) {
  const [first, ...rest] = roleParts(s);
  return (
    <li className="group relative grid gap-x-7 gap-y-3 border-t border-dashed border-border py-[18px] first:border-t-0 sm:grid-cols-[1fr_216px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <h4 className={`leading-snug font-semibold tracking-tight text-ink ${s.featured ? "text-[17px]" : "text-base"}`}>
            <ReportLink service={s}>
              {first}
              {rest.map((p) => (
                <span key={p} className="font-medium text-ink-muted">
                  {" "}
                  · {p}
                </span>
              ))}
            </ReportLink>
            {isCurrent(s.status) && <CurrentTag />}
          </h4>
          {s.dates && (
            <span className="flex-none text-[13px] text-ink-muted">
              {s.org && <span className="md:hidden">{s.org} · </span>}
              {s.dates}
            </span>
          )}
        </div>
        <p className={`mt-1 ${rowText}`}>{s.summary}</p>
        <TagList tags={s.tags.slice(0, 4)} className="mt-2.5" />
      </div>
      <div className="flex items-end justify-between gap-4 sm:flex-col sm:items-start sm:justify-start sm:pt-0.5">
        {s.metric && <Result metric={s.metric} large={s.featured} win={s.status === "winner"} />}
        <span className="ml-auto sm:mt-auto sm:self-end">
          <ReadMore />
        </span>
      </div>
    </li>
  );
}

/** One plate for all experience, grouped by org (in order of each org's first role). A featured role tints its org. */
export function Experience({ services }: { services: Service[] }) {
  const byOrg = new Map<string, Service[]>();
  for (const s of services) {
    const name = s.org ?? s.title;
    byOrg.set(name, [...(byOrg.get(name) ?? []), s]);
  }
  return (
    <Section group="experience">
      <ul className="plate mt-2.5">
        {[...byOrg].map(([name, roles]) => (
          <li
            key={name}
            className={`grid gap-x-7 border-t border-border px-5 first:border-t-0 sm:px-6 md:grid-cols-[160px_1fr] ${
              roles.some((r) => r.featured) ? "bg-linear-to-r from-accent/10 via-accent/3 to-transparent" : ""
            }`}
          >
            <OrgName org={getOrg(name)} />
            <ul>
              {roles.map((s) => (
                <Row key={s.slug} service={s} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** One plate, a column per project. */
export function Projects({ services }: { services: Service[] }) {
  return (
    <Section group="project">
      <ul className="plate mt-2.5 grid md:grid-cols-3">
        {services.map((s) => (
          <li
            key={s.slug}
            className="group relative flex flex-col border-t border-border px-5 pt-5 pb-[18px] first:border-t-0 sm:px-6 md:border-t-0 md:border-l md:first:border-l-0"
          >
            <p className="kicker">{[s.org, s.dates].filter(Boolean).join(" · ")}</p>
            <h3 className="mt-1.5 text-[17px] leading-snug font-semibold tracking-tight text-ink">
              <ReportLink service={s}>{s.title}</ReportLink>
            </h3>
            {s.metric && (
              <div className="mt-2.5">
                <Result metric={s.metric} win={s.status === "winner"} />
              </div>
            )}
            <p className={`mt-2 ${rowText}`}>{s.summary}</p>
            <TagList tags={s.tags.slice(0, 4)} className="mt-2.5" />
            <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3.5">
              {s.links.repo && (
                <ExternalLink href={s.links.repo} className={cardLink}>
                  Code<span className="sr-only"> for {s.title}</span>
                </ExternalLink>
              )}
              {s.links.demo && (
                <ExternalLink href={s.links.demo} className={cardLink}>
                  Demo<span className="sr-only"> of {s.title}</span>
                </ExternalLink>
              )}
              <span className="ml-auto">
                <ReadMore />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// Above the card's stretched report link (z-10), so they open the code or demo instead.
const cardLink =
  "relative z-10 text-[13px] font-semibold text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors hover:decoration-accent";
