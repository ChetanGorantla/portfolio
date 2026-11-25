import type { Media } from "@/lib/content";
import { isRemote, videoType } from "@/lib/media";
import { Gallery } from "./gallery";

/** Shown until the media files are added, so the layout stays the same. */
function MediaPlaceholder({ media }: { media: Media }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 border border-dashed border-ink-muted/30 bg-surface-sunken p-4 text-center">
      <span className="kicker">{media.type === "video" ? "Demo video pending" : "Screenshots pending"}</span>
      {media.missing[0] && <span className="font-mono text-[11px] text-ink-muted">{media.missing[0]}</span>}
    </div>
  );
}

/** In an incident report, after its sections: full video with controls, or a gallery. */
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
