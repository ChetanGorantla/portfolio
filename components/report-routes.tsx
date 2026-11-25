import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrg, getService, getServices, type Group } from "@/lib/content";
import { Drawer } from "./drawer";
import { IncidentReport, REPORT_TITLE_ID } from "./incident-report";

/**
 * What the report routes share. Each group has its own routes (app/experience/[slug], app/project/[slug], and their
 * drawer twins under app/@modal), and each passes its group here.
 */
export type ReportProps = { params: Promise<{ slug: string }> };

/** The slugs a group's routes prerender. The routes set dynamicParams = false, so every other path 404s. */
export function reportParams(group: Group) {
  return getServices()
    .filter((s) => s.group === group)
    .map((s) => ({ slug: s.slug }));
}

async function find(group: Group, { params }: ReportProps) {
  const service = getService((await params).slug);
  if (!service || service.group !== group) notFound();
  return service;
}

export async function reportMetadata(group: Group, props: ReportProps): Promise<Metadata> {
  const service = await find(group, props);
  return { title: `${service.title} · Project report`, description: service.summary };
}

/** Direct visits and reloads get the report as a full page. */
export async function ReportPage({ group, ...props }: ReportProps & { group: Group }) {
  const service = await find(group, props);
  return (
    <div className="shell py-10 sm:py-14">
      <div className="on-dark mx-auto max-w-[44rem]">
        <Link href="/" className="label-tag text-sm text-on-dark-muted transition-colors hover:text-on-dark">
          ← Back to home
        </Link>
      </div>
      <div className="plate mt-8 px-4 py-8 sm:px-10 sm:py-10">
        <IncidentReport service={service} />
      </div>
    </div>
  );
}

/** The drawer bar's logo box: wide enough for a wordmark, short enough to keep the bar slim. */
const BAR_LOGO = { w: 110, h: 26 };

/**
 * From the dashboard, the report opens in a drawer over it (intercepted route). Its sticky bar keeps what you're reading
 * in view: a company's own report shows the company's logo, the rest show the title and org.
 */
export async function ReportDrawer({ group, ...props }: ReportProps & { group: Group }) {
  const service = await find(group, props);
  const logo = service.org && service.title === service.org ? getOrg(service.org).logo : null;
  const scale = logo ? Math.min(BAR_LOGO.w / logo.width, BAR_LOGO.h / logo.height) : 0;
  return (
    <Drawer
      key={service.slug}
      labelledBy={REPORT_TITLE_ID}
      title={
        logo ? (
          // Plain <img>: a logo this small gains nothing from the image optimizer. The drawer inherits pixelated rendering.
          <img src={logo.src} alt="" width={Math.round(logo.width * scale)} height={Math.round(logo.height * scale)} className="block [image-rendering:auto]" />
        ) : (
          <>
            {service.title}
            {service.org && service.org !== service.title && <span className="font-normal text-ink-muted"> · {service.org}</span>}
          </>
        )
      }
    >
      <IncidentReport service={service} inDrawer />
    </Drawer>
  );
}
