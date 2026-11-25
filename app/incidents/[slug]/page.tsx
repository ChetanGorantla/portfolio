import { notFound, permanentRedirect } from "next/navigation";
import { getService, getServices, reportHref } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getServices().map((s) => ({ slug: s.slug }));
}

/** Reports used to live at /incidents/<slug>. Links shared before the rename go to the new address. */
export default async function OldIncidentLink({ params }: Props) {
  const service = getService((await params).slug);
  if (!service) notFound();
  permanentRedirect(reportHref(service));
}
