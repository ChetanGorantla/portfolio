import Link from "next/link";
import type { OverviewTile } from "@/lib/content";
import { CountUp } from "./count-up";
import { StatusDot } from "./status";

const tileClass =
  "flex h-full flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-ink-muted/40 hover:shadow-[0_2px_12px_-6px_rgb(29_28_26/0.15)] sm:p-5";

export function OverviewStrip({ tiles }: { tiles: OverviewTile[] }) {
  return (
    <section aria-labelledby="overview-heading" className="pb-14">
      <h2 id="overview-heading" className="label">
        System overview
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              {tile.status ? (
                <span className="flex min-h-9 items-center gap-2 font-mono text-[15px] font-medium leading-5 text-ink">
                  <StatusDot status={tile.status} className="size-2" />
                  {tile.value}
                </span>
              ) : (
                <span className="font-mono text-3xl font-medium leading-9 text-ink">
                  <CountUp value={tile.value} />
                </span>
              )}
              <span className="text-sm leading-5 text-ink-muted">{tile.label}</span>
            </>
          );
          // In-page anchors are plain links; routes (the Forge report) open the drawer.
          return (
            <li key={tile.label}>
              {tile.href.startsWith("#") ? (
                <a href={tile.href} className={tileClass}>
                  {body}
                </a>
              ) : (
                <Link href={tile.href} scroll={false} className={tileClass}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
