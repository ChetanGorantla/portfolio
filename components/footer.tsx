import type { Profile } from "@/lib/content";
import { ContactLinkItem, contactLinks } from "./links";

export function Footer({ links }: { links: Profile["links"] }) {
  return (
    <footer className="on-dark relative z-10 mt-20 border-t-2 border-[#6b4d26] bg-[#14120e]/90">
      <div className="shell flex py-8 sm:justify-end">
        <nav aria-label="Contact (footer)">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {contactLinks(links).map((link) => (
              <li key={link.label}>
                <ContactLinkItem link={link} className="text-sm text-on-dark-muted transition-colors hover:text-on-dark" />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
