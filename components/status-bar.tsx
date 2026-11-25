import Link from "next/link";
import type { Profile } from "@/lib/content";
import { ContactLinkItem, contactLinks } from "./links";
import { LinksMenu } from "./links-menu";
import { HealthDot, MachineryLever } from "./machinery-controls";

export function StatusBar({ links }: { links: Profile["links"] }) {
  const items = contactLinks(links);
  return (
    <header className="on-dark sticky top-0 z-40 border-b-2 border-[#6b4d26] bg-[#14120e]/92 shadow-[0_1px_0_rgb(226_189_122/0.18),0_4px_0_rgb(0_0_0/0.25)] backdrop-blur-sm">
      <div className="shell flex h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <HealthDot />
          <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2 font-mono text-[13px] hover:opacity-80 sm:gap-2.5">
            <span className="flex-none font-semibold whitespace-nowrap text-on-dark">chetan-prod</span>
            <span className="truncate text-xs text-on-dark-muted">All systems operational</span>
          </Link>
        </div>

        <nav aria-label="Contact" className="flex items-center gap-2 sm:gap-5">
          <MachineryLever />
          <ul className="hidden items-center gap-5 sm:flex">
            {items.map((link) => (
              <li key={link.label}>
                <ContactLinkItem link={link} className="text-sm text-on-dark-muted transition-colors hover:text-on-dark" />
              </li>
            ))}
          </ul>
          <LinksMenu>
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
