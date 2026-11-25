"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type SectionLink = { anchor: string; label: string };

/**
 * Jump links to the dashboard's sections, for the status bar and its phone menu. On the dashboard, the section crossing
 * the middle of the window is marked (aria-current plus an underline, not color alone).
 */
export function SectionNav({ sections, linkClass, activeClass }: { sections: SectionLink[]; linkClass: string; activeClass: string }) {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setActive(null);
    if (pathname !== "/") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
          else setActive((cur) => (cur === e.target.id ? null : cur));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const { anchor } of sections) {
      const el = document.getElementById(anchor);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname, sections]);

  return sections.map(({ anchor, label }) => {
    const props = { "aria-current": active === anchor ? ("location" as const) : undefined, className: `${linkClass} ${active === anchor ? activeClass : ""}` };
    return (
      <li key={anchor}>
        {/*
         * On the dashboard, a plain fragment link: the browser scrolls to it on every click. A <Link> to the URL you're
         * already on (/#projects after the first click) does nothing, so a second click wouldn't jump back.
         */}
        {pathname === "/" ? (
          <a href={`#${anchor}`} {...props}>
            {label}
          </a>
        ) : (
          <Link href={`/#${anchor}`} {...props}>
            {label}
          </Link>
        )}
      </li>
    );
  });
}
