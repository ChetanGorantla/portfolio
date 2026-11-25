"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";

// The element that opened the drawer (a card or tile). Module-level so it
// survives "Next incident" swaps, which remount the drawer.
let returnFocusTo: HTMLElement | null = null;

/**
 * Opening the same report twice (a double-click, or a second click while the first is still loading) stacks two
 * history entries for it, and closing the drawer then strands the page. So a report link ignores the second click of
 * a double-click and any click within a moment of the last one. Links inside the drawer (Next incident) and
 * modifier clicks (new tab) are left alone. Rendered once, in the root layout.
 */
export function IncidentClickGuard() {
  useEffect(() => {
    let last = -Infinity;
    const onClick = (e: globalThis.MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href^="/incidents/"]');
      if (!link || link.closest("dialog")) return;
      const now = performance.now();
      if (e.detail > 1 || now - last < 800) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      last = now;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

/**
 * Right-side drawer for an intercepted incident route, built on a native modal
 * <dialog>: it traps focus, makes the page behind it inert, and closes on Esc.
 * Every way of closing ends in router.back(), so the URL and history stay in sync.
 */
export function Drawer({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const unmounted = useRef(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    unmounted.current = false;

    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && !active.closest("dialog")) {
      returnFocusTo = active;
    }
    if (!el.open) el.showModal();

    // Lock page scroll; pad by the scrollbar width so nothing behind shifts.
    const html = document.documentElement;
    html.style.paddingRight = `${window.innerWidth - html.clientWidth}px`;
    html.style.overflow = "hidden";

    return () => {
      unmounted.current = true;
      html.style.overflow = "";
      html.style.paddingRight = "";
      requestAnimationFrame(() => {
        if (document.querySelector("dialog[data-drawer][open]")) return; // swapped to the next incident
        returnFocusTo?.focus({ preventScroll: true });
        returnFocusTo = null;
      });
    };
  }, []);

  // Esc, the close button, and backdrop clicks all close the dialog first.
  // React propagates `close` up its tree, so ignore it from nested dialogs (the lightbox).
  const onClose = (e: SyntheticEvent) => {
    if (e.target !== e.currentTarget || unmounted.current) return;
    // Unlock scrolling as soon as it closes, not when it unmounts: if the navigation below stalls, the page
    // must still scroll.
    const html = document.documentElement;
    html.style.overflow = "";
    html.style.paddingRight = "";
    router.back();
    // If the report was somehow opened twice, going back lands on the same report with no drawer open, and the
    // router no longer matches the address bar (soft navigation can't get out). Last resort: load the dashboard.
    window.addEventListener(
      "popstate",
      () =>
        window.setTimeout(() => {
          if (window.location.pathname.startsWith("/incidents/") && !document.querySelector("dialog[data-drawer][open]")) {
            window.location.replace("/");
          }
        }, 300),
      { once: true },
    );
  };

  // Only treat it as a backdrop click if the press also started there,
  // so selecting text and releasing outside doesn't close the drawer.
  const onMouseDown = (e: MouseEvent) => {
    pressStartedOnBackdrop.current = e.target === e.currentTarget;
  };
  const onClick = (e: MouseEvent) => {
    if (pressStartedOnBackdrop.current && e.target === e.currentTarget) dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      data-drawer=""
      aria-labelledby={labelledBy}
      className="drawer"
      onClose={onClose}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="h-full overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur-sm sm:px-8">
          <span className="label">Logbook · Incident report</span>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="flex items-center gap-2 px-2 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            Close
            <kbd aria-hidden="true" className="sunken hidden px-1.5 font-mono text-[10px] text-ink-muted sm:inline">
              Esc
            </kbd>
          </button>
        </div>
        <div className="px-4 pt-8 pb-16 sm:px-8">{children}</div>
      </div>
    </dialog>
  );
}
