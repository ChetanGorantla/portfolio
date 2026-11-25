import type { Status } from "@/lib/content";

const LAMP: Record<Status, string> = {
  resolved: "lamp-ok",
  shipped: "lamp-ok",
  operational: "lamp-ok",
  "in-progress": "lamp-info",
  winner: "lamp-warn",
};

/** A small glass indicator lamp (green, blue or amber), like the ones on the machinery behind the page. */
export function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  return <span aria-hidden="true" className={`lamp ${LAMP[status]} ${className}`} />;
}

/** Roles that are still running. They're marked "Current" (lamp + word, never color alone); no other status is shown. */
export function isCurrent(status: Status) {
  return status === "in-progress" || status === "operational";
}

export function CurrentTag({ className = "ml-2" }: { className?: string }) {
  return (
    <span className={`kicker inline-flex items-center gap-1.5 align-[1px] text-info ${className}`}>
      <StatusDot status="in-progress" />
      Current
    </span>
  );
}
