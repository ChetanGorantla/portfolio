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

/** Lamp + label. Status is never conveyed by color alone. */
export function StatusTag({ status, label }: { status: Status; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <StatusDot status={status} />
      <span className="sr-only">Status: </span>
      <span className="kicker text-ink">{label}</span>
    </span>
  );
}

/** Roles that are still running. The dashboard marks them "Current" instead of showing their status. */
export function isCurrent(status: Status) {
  return status === "in-progress" || status === "operational";
}

export function CurrentTag() {
  return (
    <span className="kicker ml-2 inline-flex items-center gap-1.5 align-[1px] text-info">
      <StatusDot status="in-progress" />
      Current
    </span>
  );
}
