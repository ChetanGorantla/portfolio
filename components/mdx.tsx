import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { MDXComponents as Components } from "mdx/types";
import { ExternalLink, isExternal } from "./links";

// Inline links keep a faint underline at rest so they're distinguishable from
// body text without relying on color (WCAG 1.4.1); it strengthens on hover.
export const inlineLink =
  "text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors hover:decoration-accent";

function A({ href = "", children }: ComponentProps<"a">) {
  return isExternal(href) ? (
    <ExternalLink href={href} className={inlineLink}>
      {children}
    </ExternalLink>
  ) : (
    <a href={href} className={inlineLink}>
      {children}
    </a>
  );
}

function Strong(props: ComponentProps<"strong">) {
  return <strong className="font-semibold text-ink" {...props} />;
}

const shared: Components = {
  a: A,
  strong: Strong,
  code: (props) => <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.85em]" {...props} />,
};

/** Incident report bodies. */
const report: Components = {
  ...shared,
  h2: (props) => <h2 className="mt-10 mb-3 text-lg font-semibold tracking-tight text-ink first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-6 mb-2 font-semibold text-ink" {...props} />,
  p: (props) => <p className="my-4 leading-7" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-2 pl-5 leading-7 marker:text-ink-muted" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-2 pl-5 leading-7 marker:text-ink-muted" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 rounded-lg border border-dashed border-ink-muted/40 bg-surface-sunken px-4 py-3 text-[15px] text-ink-muted [&>p]:my-0"
      {...props}
    />
  ),
};

/** Hero paragraph(s) on the dashboard. */
const hero: Components = {
  ...shared,
  p: (props) => <p className="mt-4 max-w-[62ch] text-lg leading-8 text-ink" {...props} />,
};

/** Small panels (changelog, on-call notes). */
const panel: Components = {
  ...shared,
  p: (props) => <p className="mt-3 leading-7 first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-3 space-y-2.5 leading-7" {...props} />,
};

/** Changelog entries: `- **Nov 2026**: text` renders as a date column + text. */
const changelog: Components = {
  ...panel,
  ul: (props) => <ul className="divide-y divide-border" {...props} />,
  li: ({ children }) => {
    const [first, ...rest] = Children.toArray(children);
    if (!isValidElement<{ children: ReactNode }>(first) || first.type !== Strong) {
      return <li className="py-3 leading-6">{children}</li>;
    }
    if (typeof rest[0] === "string") rest[0] = rest[0].replace(/^\s*[:–—-]\s*/, "");
    return (
      <li className="grid grid-cols-[8.5rem_1fr] gap-3 py-3 leading-6 first:pt-0 last:pb-0">
        <span className="label pt-1 leading-5 whitespace-nowrap">{first.props.children}</span>
        <span>{rest}</span>
      </li>
    );
  },
};

const VARIANTS = { report, hero, panel, changelog };

export function Mdx({ source, variant }: { source: string; variant: keyof typeof VARIANTS }) {
  return <MDXRemote source={source} components={VARIANTS[variant]} />;
}
