import type { Profile } from "@/lib/content";
import { Mdx } from "./mdx";

export function Hero({ profile }: { profile: Profile }) {
  return (
    <section aria-labelledby="hero-name" className="pt-14 pb-10 sm:pt-20">
      <p className="label">Service description</p>
      <h1 id="hero-name" className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        {profile.name}
      </h1>
      <Mdx source={profile.hero} variant="hero" />

      <dl className="mt-8 space-y-2.5 text-[15px] leading-6">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="label w-24 flex-none pt-1">Currently</dt>
          <dd className="text-ink">{profile.currently.join(" · ")}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="label w-24 flex-none pt-1">Focus</dt>
          <dd className="text-ink">{profile.focus.join(" · ")}</dd>
        </div>
      </dl>
      <p className="mt-5 text-sm text-ink-muted">
        <span className="label mr-2">Previously</span>
        {profile.previously.join(" · ")}
      </p>
    </section>
  );
}
