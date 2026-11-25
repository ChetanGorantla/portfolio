import { GROUPS, type Service } from "@/lib/content";
import { RunbookCard } from "./runbook-card";
import { ServiceCard } from "./service-card";

// Static class names so Tailwind can see them.
const MD_SPAN: Record<number, string> = { 1: "md:col-span-1", 2: "md:col-span-2" };
const LG_SPAN: Record<number, string> = { 4: "lg:col-span-4", 5: "lg:col-span-5", 6: "lg:col-span-6", 7: "lg:col-span-7", 12: "lg:col-span-12" };

/**
 * Packs cards into rows of `perRow` units (a featured card is `featured` units), then
 * stretches any short row so the grid never has an empty cell. Returns each
 * card's span on a `columns`-wide grid.
 */
function spans(services: Service[], perRow: number, columns: number, featured: number): number[] {
  const rows: number[][] = [];
  let row: number[] = [];
  let used = 0;
  for (const s of services) {
    const width = s.featured ? Math.min(featured, perRow) : 1;
    if (used + width > perRow) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(width);
    used += width;
  }
  if (row.length) rows.push(row);
  return rows.flatMap((r) => {
    const total = r.reduce((a, b) => a + b, 0);
    const out = r.map((width) => Math.round((width * columns) / total));
    out[out.length - 1] += columns - out.reduce((a, b) => a + b, 0); // rounding never leaves a gap
    return out;
  });
}

export function ServicesGrid({ services }: { services: Service[] }) {
  return (
    <div className="space-y-14">
      {GROUPS.map((group) => {
        const items = services.filter((s) => s.group === group.id);
        if (items.length === 0) return null;
        const md = spans(items, 2, 2, 2);
        // Wide screens: a featured card is a little wider than its neighbour (7/12 beside 5/12), not double.
        const lg = spans(items, 3, 12, 1.4);
        return (
          <section key={group.id} id={group.anchor} aria-labelledby={`${group.anchor}-heading`}>
            <h2 id={`${group.anchor}-heading`} className="label label-tag">
              {group.label}
            </h2>
            <ul className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
              {items.map((s, i) => (
                <li key={s.slug} className={`${MD_SPAN[md[i]]} ${LG_SPAN[lg[i]]}`}>
                  {s.group === "teaching" ? <RunbookCard service={s} /> : <ServiceCard service={s} />}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
