import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/content";

export const alt = "chetan-prod · All systems operational. Chetan Gorantla.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same values as the CSS tokens in globals.css (Satori can't read CSS variables).
const C = {
  bg: "#f5f2eb",
  surface: "#fbf9f4",
  border: "#e2ddd1",
  ink: "#1d1c1a",
  muted: "#6b665d",
  ok: "#2f7d5b",
};

function font(pkg: string, file: string) {
  return readFile(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));
}

export default async function OpenGraphImage() {
  const profile = getProfile();
  const [inter400, inter600, mono400, mono500] = await Promise.all([
    font("inter", "inter-latin-400-normal.woff"),
    font("inter", "inter-latin-600-normal.woff"),
    font("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff"),
    font("jetbrains-mono", "jetbrains-mono-latin-500-normal.woff"),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: C.bg }}>
        {/* Status bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 88,
            padding: "0 64px",
            borderBottom: `2px solid ${C.border}`,
            fontFamily: "JetBrains Mono",
            fontSize: 28,
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 9, background: C.ok, marginRight: 18 }} />
          <span style={{ color: C.ink, fontWeight: 500 }}>chetan-prod</span>
          <span style={{ color: C.muted, margin: "0 16px" }}>·</span>
          <span style={{ color: C.muted }}>All systems operational</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "0 64px" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontSize: 22,
              letterSpacing: 2,
              color: C.muted,
              textTransform: "uppercase",
            }}
          >
            Service description
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: 92,
              letterSpacing: -2,
              color: C.ink,
            }}
          >
            {profile.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 36,
              padding: "20px 28px",
              background: C.surface,
              border: `2px solid ${C.border}`,
              borderRadius: 16,
              fontSize: 26,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                letterSpacing: 2,
                color: C.muted,
                textTransform: "uppercase",
                marginRight: 24,
              }}
            >
              Focus
            </span>
            <span style={{ fontFamily: "Inter", color: C.ink }}>{profile.focus.join(" · ")}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: inter400, weight: 400, style: "normal" },
        { name: "Inter", data: inter600, weight: 600, style: "normal" },
        { name: "JetBrains Mono", data: mono400, weight: 400, style: "normal" },
        { name: "JetBrains Mono", data: mono500, weight: 500, style: "normal" },
      ],
    },
  );
}
