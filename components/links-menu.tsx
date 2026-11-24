"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Compact disclosure menu for the status bar links on small screens. */
export function LinksMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative sm:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="status-links"
        aria-label="Links"
        onClick={() => setOpen((o) => !o)}
        className="-mr-2 flex size-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div
        id="status-links"
        hidden={!open}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className="absolute right-0 top-full mt-2 min-w-40 rounded-xl border border-border bg-surface p-1.5"
      >
        {children}
      </div>
    </div>
  );
}
