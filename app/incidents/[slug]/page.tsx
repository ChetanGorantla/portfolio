import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IncidentReport } from "@/components/incident-report";
import { getService, getServices } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = getService((await params).slug);
  if (!service) return {};
  return { title: `${service.title} · Incident report`, description: service.summary };
}

/** Direct visits get the report as a full page. */
export default async function IncidentPage({ params }: Props) {
  const service = getService((await params).slug);
  if (!service) notFound();
  return (
    <div className="shell py-10 sm:py-14">
      <div className="on-dark mx-auto max-w-[70ch]">
        <Link href="/" className="label-tag text-sm text-on-dark-muted transition-colors hover:text-on-dark">
          ← Back to dashboard
        </Link>
      </div>
      <div className="plate mt-8 px-4 py-8 sm:px-10 sm:py-10">
        <IncidentReport service={service} />
      </div>
    </div>
  );
}
