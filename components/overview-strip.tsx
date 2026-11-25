import Link from "next/link";
import type { OverviewTile } from "@/lib/content";
import { CountUp } from "./count-up";
import { StatusDot } from "./status";

const tileClass = "plate plate-link flex h-full flex-col justify-between gap-3 p-3 sm:p-4";

export function OverviewStrip({ tiles }: { tiles: OverviewTile[] }) {
  return (
    <section aria-labelledby="overview-heading" className="pb-14">
      <h2 id="overview-heading" className="label label-tag">
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
            <li key={tile.label} data-wake="">
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
