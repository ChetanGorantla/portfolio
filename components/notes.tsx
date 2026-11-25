import { Mdx } from "./mdx";

/** Changelog + on-call notes, side by side (stacked on mobile). */
export function Notes({ changelog, oncall }: { changelog: string; oncall: string }) {
  return (
    <div className="grid gap-4 pt-16 md:grid-cols-2">
      <section aria-labelledby="changelog-heading" data-wake="" className="plate p-6">
        <h2 id="changelog-heading" className="label">
          Changelog
        </h2>
        <div className="mt-4 text-[15px] text-ink">
          <Mdx source={changelog} variant="changelog" />
        </div>
      </section>
      <section aria-labelledby="oncall-heading" data-wake="" className="plate p-6">
        <h2 id="oncall-heading" className="label">
          On-call notes
        </h2>
        <div className="mt-4 text-[15px] text-ink">
          <Mdx source={oncall} variant="panel" />
        </div>
      </section>
    </div>
  );
}
