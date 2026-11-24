"use client";

import { useEffect, useRef } from "react";
import { videoType } from "@/lib/media";

/**
 * Card preview: muted loop that only loads and plays while on screen.
 * With reduced motion it stays paused on its first frame.
 */
export function LazyVideo({ srcs, label }: { srcs: string[]; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.preload = "metadata";
      video.load();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "200px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video ref={ref} muted loop playsInline preload="none" aria-label={label} className="size-full object-cover">
      {srcs.map((src) => (
        <source key={src} src={src} type={videoType(src)} />
      ))}
    </video>
  );
}
