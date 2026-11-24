"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { MediaItem } from "@/lib/content";

/** Screenshot grid with a lightbox (native modal dialog: Esc closes, arrows step). */
export function Gallery({ images }: { images: MediaItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;
  const step = (delta: number) => setIndex((i) => (i + delta + count) % count);

  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  };

  const onClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) dialog.current?.close();
  };

  const current = images[index];
  const button =
    "rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-xs text-ink hover:bg-surface-sunken";

  return (
    <>
      <ul className={`grid gap-3 ${count > 1 ? "sm:grid-cols-2" : ""}`}>
        {images.map((img, i) => (
          <li key={img.src}>
            <button
              type="button"
              onClick={() => open(i)}
              className="relative block aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-surface-sunken"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 768px) 340px, 100vw"
                className="object-cover transition-transform duration-300 motion-safe:hover:scale-[1.02]"
              />
              <span className="sr-only">
                (open image {i + 1} of {count})
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialog} aria-label="Screenshot viewer" className="lightbox" onKeyDown={onKeyDown} onClick={onClick}>
        <div className="flex size-full flex-col items-center justify-center gap-4 p-4 sm:p-10" onClick={onClick}>
          <div className="relative h-full max-h-[80vh] w-full max-w-5xl">
            <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
          </div>
          <div className="flex items-center gap-3">
            {count > 1 && (
              <button type="button" onClick={() => step(-1)} className={button}>
                ← Prev
              </button>
            )}
            <span className="font-mono text-xs text-surface" aria-live="polite">
              {index + 1} / {count}
            </span>
            {count > 1 && (
              <button type="button" onClick={() => step(1)} className={button}>
                Next →
              </button>
            )}
            <button type="button" onClick={() => dialog.current?.close()} className={button}>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
