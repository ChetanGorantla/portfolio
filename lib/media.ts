const VIDEO_TYPES: Record<string, string> = { mp4: "video/mp4", webm: "video/webm" };

export function videoType(src: string): string | undefined {
  return VIDEO_TYPES[src.split(".").pop()?.toLowerCase() ?? ""];
}

export function isRemote(src: string) {
  return /^https?:\/\//.test(src);
}
