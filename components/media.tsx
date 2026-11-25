import Image from "next/image";
import type { Media } from "@/lib/content";
import { isRemote, videoType } from "@/lib/media";
import { Gallery } from "./gallery";
import { LazyVideo } from "./lazy-video";

/** Shown until the media files are added, so the layout stays the same. */
function MediaPlaceholder({ media }: { media: Media }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 border border-dashed border-ink-muted/30 bg-surface-sunken p-4 text-center">
      <span className="label">{media.type === "video" ? "Demo video pending" : "Screenshots pending"}</span>
      {media.missing[0] && <span className="font-mono text-[11px] text-ink-muted">{media.missing[0]}</span>}
    </div>
  );
}

/** Top of a dashboard card: a muted looping preview or the first screenshot. */
export function CardMedia({ media }: { media: Media }) {
  const first = media.items[0];
  let content;
  if (!first) {
    content = <MediaPlaceholder media={media} />;
  } else if (media.type === "images") {
    content = (
      <Image
        src={first.src}
        alt={first.alt}
        fill
        sizes="(min-width: 1024px) 340px, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    );
  } else if (isRemote(first.src)) {
    // Embeds (YouTube/Loom) only load in the report, to keep the dashboard light.
    content = (
      <div className="flex size-full items-center justify-center bg-surface-sunken">
        <span className="label">▶ Demo video</span>
      </div>
    );
  } else {
    content = <LazyVideo srcs={media.items.map((i) => i.src)} label={media.alt} />;
  }
  return (
    <div className="relative aspect-video overflow-hidden border-b-2 border-[#3a2a16]/50 bg-surface-sunken">
      {content}
    </div>
  );
}

/** Below the incident report header: full video with controls, or a gallery. */
export function ReportMedia({ media }: { media: Media }) {
  const first = media.items[0];
  if (!first) {
    return (
      <div className="aspect-video overflow-hidden rounded-lg">
        <MediaPlaceholder media={media} />
      </div>
    );
  }
  if (media.type === "images") return <Gallery images={media.items} />;
  if (isRemote(first.src)) {
    return (
      <iframe
        src={first.src}
        title={media.alt}
        loading="lazy"
        allow="fullscreen; picture-in-picture"
        className="aspect-video w-full rounded-lg border border-border"
      />
    );
  }
  return (
    <video
      controls
      playsInline
      preload="metadata"
      aria-label={media.alt}
      className="aspect-video w-full rounded-lg border border-border bg-surface-sunken"
    >
      {media.items.map((item) => (
        <source key={item.src} src={item.src} type={videoType(item.src)} />
      ))}
    </video>
  );
}
