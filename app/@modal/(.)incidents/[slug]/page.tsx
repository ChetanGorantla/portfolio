import { notFound } from "next/navigation";
import { Drawer } from "@/components/drawer";
import { IncidentReport, REPORT_TITLE_ID } from "@/components/incident-report";
import { getService, getServices } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getServices().map((s) => ({ slug: s.slug }));
}

/** From the dashboard, the report opens in a drawer over it (intercepted route). */
export default async function IncidentDrawer({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();
  return (
    <Drawer key={slug} labelledBy={REPORT_TITLE_ID}>
      <IncidentReport service={service} inDrawer />
    </Drawer>
  );
}
