import type { ComponentProps, ReactNode } from "react";
import type { Profile } from "@/lib/content";

export function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

/** Opens in a new tab with a small ↗ so it's clear the link leaves the site. */
export function ExternalLink({ href, children, className, ...rest }: ComponentProps<"a"> & { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
      {children}
      <span aria-hidden="true" className="ml-0.5 text-[0.85em]">
        ↗
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export type ContactLink = { label: string; href: string; newTab: boolean };

/** GitHub, LinkedIn, Email: whichever are filled in. */
export function contactLinks(links: Profile["links"]): ContactLink[] {
  const all: (ContactLink | null)[] = [
    links.github ? { label: "GitHub", href: links.github, newTab: true } : null,
    links.linkedin ? { label: "LinkedIn", href: links.linkedin, newTab: true } : null,
    links.email ? { label: "Email", href: links.email, newTab: false } : null,
  ];
  return all.filter((l): l is ContactLink => l !== null);
}

export function ContactLinkItem({ link, className }: { link: ContactLink; className?: string }): ReactNode {
  return link.newTab ? (
    <ExternalLink href={link.href} className={className}>
      {link.label}
    </ExternalLink>
  ) : (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}
