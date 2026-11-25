import { ReportPage, reportMetadata, reportParams, type ReportProps } from "@/components/report-routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return reportParams("experience");
}

export function generateMetadata(props: ReportProps) {
  return reportMetadata("experience", props);
}

export default function Page(props: ReportProps) {
  return <ReportPage group="experience" {...props} />;
}
