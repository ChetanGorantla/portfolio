import type { ComponentProps } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { MDXComponents as Components } from "mdx/types";
import { ExternalLink, isExternal } from "./links";

// Inline links keep a faint underline at rest so they're distinguishable from
// body text without relying on color (WCAG 1.4.1); it strengthens on hover.
export const inlineLink =
  "text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors hover:decoration-accent";

function linkTo(className: string) {
  return function A({ href = "", children }: ComponentProps<"a">) {
    return isExternal(href) ? (
      <ExternalLink href={href} className={className}>
        {children}
      </ExternalLink>
    ) : (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
}

function Strong(props: ComponentProps<"strong">) {
  return <strong className="font-semibold text-ink" {...props} />;
}

const shared: Components = {
  a: linkTo(inlineLink),
  strong: Strong,
  code: (props) => <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.85em]" {...props} />,
};

/** An incident report's sections (one per cell of its two-column grid). */
const report: Components = {
  ...shared,
  h3: (props) => <h3 className="mt-3 mb-1 font-semibold text-ink first:mt-0" {...props} />,
  p: (props) => <p className="mt-2 text-[14.5px] leading-[1.55] text-ink/85 first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-2 list-[square] space-y-1 pl-4 text-[14.5px] leading-[1.55] text-ink/85 marker:text-ok first:mt-0" {...props} />,
  ol: (props) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14.5px] leading-[1.55] text-ink/85 marker:font-semibold marker:text-ink-muted first:mt-0" {...props} />
  ),
};

/** A report's opening "In short" section. */
const lead: Components = {
  ...shared,
  p: (props) => <p className="mt-3 text-base leading-relaxed text-ink first:mt-0" {...props} />,
};

/** Hero paragraph(s) on the dashboard. */
const hero: Components = {
  ...shared,
  p: (props) => <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink/85 first:mt-0 sm:text-base" {...props} />,
};

/** A list as one dot-separated line of light text on the dark scene ("Off the clock"). */
const inline: Components = {
  ...shared,
  a: linkTo("text-on-dark underline decoration-on-dark/40 underline-offset-[3px] transition-colors hover:decoration-on-dark"),
  ul: (props) => <ul className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-on-dark-muted" {...props} />,
  li: (props) => <li className="after:ml-2 after:content-['·'] last:after:content-none" {...props} />,
};

const VARIANTS = { report, lead, hero, inline };

export function Mdx({ source, variant }: { source: string; variant: keyof typeof VARIANTS }) {
  return <MDXRemote source={source} components={VARIANTS[variant]} />;
}
