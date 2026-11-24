"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";

// The element that opened the drawer (a card or tile). Module-level so it
// survives "Next incident" swaps, which remount the drawer.
let returnFocusTo: HTMLElement | null = null;

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
    if (e.target === e.currentTarget && !unmounted.current) router.back();
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
          <span className="label">Incident report</span>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            Close
            <kbd aria-hidden="true" className="hidden rounded border border-border bg-surface-sunken px-1.5 font-mono text-[10px] text-ink-muted sm:inline">
              Esc
            </kbd>
          </button>
        </div>
        <div className="px-4 pt-8 pb-16 sm:px-8">{children}</div>
      </div>
    </dialog>
  );
}
