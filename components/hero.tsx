import type { Profile } from "@/lib/content";
import { ContactLinkItem, contactLinks } from "./links";
import { Mdx } from "./mdx";
import { Portrait } from "./portrait";
import { StatusDot } from "./status";

/**
 * One plate: photo, name, the hero paragraph and what I'm doing now, with the headline numbers beside them.
 * Wide screens: photo | text | numbers. Narrow: photo beside the name, then the text, then the numbers in a row.
 */
export function Hero({ profile }: { profile: Profile }) {
  return (
    <section
      aria-labelledby="hero-name"
      className="plate mt-7 grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-4 p-5 sm:mt-8 sm:gap-x-7 sm:p-6 lg:grid-cols-[auto_1fr_236px] lg:gap-x-8"
    >
      <div className="lg:row-span-2">
        <Portrait name={profile.name} />
      </div>
      <div className="self-end">
        <h1 id="hero-name" className="text-3xl font-bold tracking-tight text-ink sm:text-[40px] sm:leading-[1.08]">
          {profile.name}
        </h1>
        <p className="mt-1.5 text-sm font-medium text-ink-muted sm:text-[15px]">{profile.tagline}</p>
      </div>
      <div className="col-span-2 self-start lg:col-span-1 lg:col-start-2">
        <Mdx source={profile.hero} variant="hero" />
        <p className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink">
          <StatusDot status="in-progress" />
          <span className="kicker text-info">Now</span>
          {profile.currently.join(" · ")}
        </p>
      </div>
      <ul className="col-span-2 grid grid-cols-3 gap-4 border-t border-border pt-4 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:flex lg:flex-col lg:self-center lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
        {profile.overview.map(({ value, label }) => (
          <li key={label}>
            <span className="block text-2xl leading-none font-bold tracking-tight text-ink lg:text-[28px]">{value}</span>
            <span className="mt-1 block text-[13px] leading-snug text-ink-muted">{label}</span>
          </li>
        ))}
      </ul>
      {/* Phones hide the header's links behind a menu, so the hero shows them. */}
      <nav aria-label="Contact (hero)" className="col-span-2 sm:hidden">
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {contactLinks(profile.links).map((link) => (
            <li key={link.label}>
              <ContactLinkItem
                link={link}
                className="text-sm font-semibold text-accent underline decoration-accent/30 underline-offset-[3px] hover:decoration-accent"
              />
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
