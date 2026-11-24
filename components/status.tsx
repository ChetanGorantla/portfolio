import type { Status } from "@/lib/content";

const DOT: Record<Status, string> = {
  resolved: "bg-ok",
  shipped: "bg-ok",
  operational: "bg-ok",
  "in-progress": "bg-accent",
  winner: "bg-warn",
};

export function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-1.5 flex-none rounded-full ${DOT[status]} ${className}`} />;
}

/** Dot + monospace label. Status is never conveyed by color alone. */
export function StatusTag({ status, label }: { status: Status; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[11px] leading-4 text-ink">
      <StatusDot status={status} />
      <span className="sr-only">Status: </span>
      {label}
    </span>
  );
}
