import Link from "next/link";
import { GROUPS, type Profile } from "@/lib/content";
import { ContactLinkItem, contactLinks } from "./links";
import { LinksMenu } from "./links-menu";
import { HealthDot } from "./machinery-controls";
import { SectionNav } from "./section-nav";

const sections = GROUPS.map(({ anchor, label }) => ({ anchor, label }));

export function StatusBar({ name, links }: { name: string; links: Profile["links"] }) {
  const items = contactLinks(links);
  return (
    <header className="on-dark sticky top-0 z-40 border-b-2 border-[#6b4d26] bg-[#14120e]/92 shadow-[0_1px_0_rgb(226_189_122/0.18),0_4px_0_rgb(0_0_0/0.25)] backdrop-blur-sm">
      <div className="shell flex h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <HealthDot />
          <Link href="/" prefetch={false} className="truncate text-[15px] font-semibold tracking-tight text-on-dark hover:opacity-80">
            {name}
          </Link>
        </div>

        <nav aria-label="Site" className="flex items-center gap-2 sm:gap-5">
          <ul className="hidden items-center gap-5 border-r border-on-dark-muted/25 pr-5 sm:flex">
            <SectionNav
              sections={sections}
              linkClass="text-sm text-on-dark-muted underline-offset-[6px] transition-colors hover:text-on-dark"
              activeClass="text-on-dark underline decoration-[#e9c46a] decoration-2"
            />
          </ul>
          <ul className="hidden items-center gap-5 sm:flex">
            {items.map((link) => (
              <li key={link.label}>
                <ContactLinkItem link={link} className="text-sm text-on-dark-muted transition-colors hover:text-on-dark" />
              </li>
            ))}
          </ul>
          <LinksMenu>
            <ul className="mb-1.5 border-b border-on-dark-muted/20 pb-1.5">
              <SectionNav
                sections={sections}
                linkClass="block rounded-md px-3 py-2 text-sm text-on-dark hover:bg-white/8"
                activeClass="underline decoration-[#e9c46a] decoration-2 underline-offset-4"
              />
            </ul>
            <ul>
              {items.map((link) => (
                <li key={link.label}>
                  <ContactLinkItem link={link} className="block rounded-md px-3 py-2 text-sm text-on-dark hover:bg-white/8" />
                </li>
              ))}
            </ul>
          </LinksMenu>
        </nav>
      </div>
    </header>
  );
}
