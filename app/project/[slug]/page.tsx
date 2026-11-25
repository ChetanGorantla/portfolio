import { ReportPage, reportMetadata, reportParams, type ReportProps } from "@/components/report-routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return reportParams("project");
}

export function generateMetadata(props: ReportProps) {
  return reportMetadata("project", props);
}

export default function Page(props: ReportProps) {
  return <ReportPage group="project" {...props} />;
}
