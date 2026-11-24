import Link from "next/link";
import type { Profile } from "@/lib/content";
import { ContactLinkItem, contactLinks } from "./links";
import { LinksMenu } from "./links-menu";

export function StatusBar({ links }: { links: Profile["links"] }) {
  const items = contactLinks(links);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-sm">
      <div className="shell flex h-12 items-center justify-between gap-3">
        <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2 font-mono text-[13px] hover:opacity-80 sm:gap-2.5">
          <span className="pulse-dot" aria-hidden="true" />
          <span className="flex-none font-semibold whitespace-nowrap text-ink">chetan-prod</span>
          <span className="truncate text-xs text-ink-muted">All systems operational</span>
        </Link>

        <nav aria-label="Contact" className="flex items-center">
          <ul className="hidden items-center gap-5 sm:flex">
            {items.map((link) => (
              <li key={link.label}>
                <ContactLinkItem link={link} className="text-sm text-ink-muted transition-colors hover:text-ink" />
              </li>
            ))}
          </ul>
          <LinksMenu>
            <ul>
              {items.map((link) => (
                <li key={link.label}>
                  <ContactLinkItem
                    link={link}
                    className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-sunken"
                  />
                </li>
              ))}
            </ul>
          </LinksMenu>
        </nav>
      </div>
    </header>
  );
}
