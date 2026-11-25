import type { Profile } from "@/lib/content";
import { ContactLinkItem, contactLinks } from "./links";

/** "Last deployed <date> · commit <sha>", falling back to "local" outside Vercel builds. */
function deployStamp() {
  const dev = process.env.NODE_ENV === "development";
  const date = !dev && process.env.BUILD_TIME ? process.env.BUILD_TIME.slice(0, 10) : "local";
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";
  return { date, sha };
}

export function Footer({ links }: { links: Profile["links"] }) {
  const { date, sha } = deployStamp();
  return (
    <footer className="on-dark relative z-10 mt-20 border-t-2 border-[#6b4d26] bg-[#14120e]/90">
      <div className="shell flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs text-on-dark-muted">
          Last deployed <time dateTime={date === "local" ? undefined : date}>{date}</time> · commit {sha}
        </p>
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
