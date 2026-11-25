import type { Profile } from "@/lib/content";
import { Mdx } from "./mdx";
import { Portrait } from "./portrait";

/**
 * The inspector's ID plate, then the service description on its own plate. On wide screens the plate stops short of
 * the right edge: the engine room's flywheel and maker's plate turn in that space.
 */
export function Hero({ profile }: { profile: Profile }) {
  return (
    <section aria-labelledby="hero-name" className="flex flex-col gap-5 pt-10 pb-10 sm:flex-row sm:items-start sm:gap-6 sm:pt-14">
      <Portrait name={profile.name} title="Chief engineer" stamp="C. Gorantla" />
      <div className="plate min-w-0 flex-1 p-5 sm:p-7 lg:max-w-[600px]">
        <p className="label">Service description</p>
        <h1 id="hero-name" className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {profile.name}
        </h1>
        <Mdx source={profile.hero} variant="hero" />

        <dl className="mt-8 space-y-2.5 text-[15px] leading-6">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="label w-36 flex-none pt-0.5">Currently</dt>
            <dd className="text-ink">{profile.currently.join(" · ")}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="label w-36 flex-none pt-0.5">Focus</dt>
            <dd className="text-ink">{profile.focus.join(" · ")}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm text-ink-muted">
          <span className="label mr-2">Previously</span>
          {profile.previously.join(" · ")}
        </p>
      </div>
    </section>
  );
}
