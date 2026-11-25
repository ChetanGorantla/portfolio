import Image from "next/image";

/**
 * The headshot, cropped to head and shoulders: fractions of the (upright) photo, stopping right of the raised hand.
 * The crop's aspect matches the 4:5 window. The src's case must match the file (Vercel is case-sensitive).
 */
const PHOTO = { src: "/media/headshot.JPG", w: 2448, h: 3696 };
const CROP = { x: 0.4, y: 0.25, w: 0.44, h: 0.3643 };

export function Portrait({ name }: { name: string }) {
  return (
    <div className="relative aspect-[4/5] w-24 flex-none overflow-hidden border-[3px] border-[#6b4d26] bg-surface-sunken shadow-[2px_2px_0_rgb(8_6_4/0.3)] [image-rendering:auto] sm:w-[136px]">
      <Image
        src={PHOTO.src}
        alt={`Portrait of ${name}`}
        width={PHOTO.w}
        height={PHOTO.h}
        sizes="(min-width: 640px) 310px, 220px"
        loading="eager"
        fetchPriority="high"
        style={{
          position: "absolute",
          maxWidth: "none",
          width: `${100 / CROP.w}%`,
          height: "auto",
          left: `${(-CROP.x / CROP.w) * 100}%`,
          top: `${(-CROP.y / CROP.h) * 100}%`,
        }}
      />
    </div>
  );
}
