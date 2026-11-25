import { ReportDrawer, reportParams, type ReportProps } from "@/components/report-routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return reportParams("experience");
}

export default function Page(props: ReportProps) {
  return <ReportDrawer group="experience" {...props} />;
}
