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

/** Lamp + stamped label. Status is never conveyed by color alone. */
export function StatusTag({ status, label }: { status: Status; label: string }) {
  return (
    <span className="sunken inline-flex items-center gap-2 px-2 py-1">
      <StatusDot status={status} />
      <span className="sr-only">Status: </span>
      <span className="label leading-4 text-ink">{label}</span>
    </span>
  );
}
