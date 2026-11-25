import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/content";

export const alt = "chetan-prod · All systems operational. Chetan Gorantla.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same values as the CSS tokens in globals.css (Satori can't read CSS variables).
const C = {
  bar: "#14120e",
  bronze: "#6b4d26",
  surface: "#ece2c8",
  ink: "#1f1a13",
  muted: "#5c5242",
  onDark: "#ece1c6",
  onDarkMuted: "#b6a888",
  lamp: "#3fe0a0",
};

function font(pkg: string, file: string) {
  return readFile(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));
}

export default async function OpenGraphImage() {
  const profile = getProfile();
  const [inter400, inter600, mono400, mono500, scene] = await Promise.all([
    font("inter", "inter-latin-400-normal.woff"),
    font("inter", "inter-latin-600-normal.woff"),
    font("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff"),
    font("jetbrains-mono", "jetbrains-mono-latin-500-normal.woff"),
    // The engine room at 2x, left side darkened for the text (painted by scene/build.ts).
    readFile(path.join(process.cwd(), "public/scene/og.png")),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: C.bar, position: "relative" }}>
        <img src={`data:image/png;base64,${scene.toString("base64")}`} width={1200} height={630} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
        {/* Status bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 88,
            padding: "0 64px",
            background: C.bar,
            borderBottom: `4px solid ${C.bronze}`,
            fontFamily: "JetBrains Mono",
            fontSize: 28,
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 9, background: C.lamp, marginRight: 18, boxShadow: `0 0 12px ${C.lamp}` }} />
          <span style={{ color: C.onDark, fontWeight: 500 }}>chetan-prod</span>
          <span style={{ color: C.onDarkMuted, margin: "0 16px" }}>·</span>
          <span style={{ color: C.onDarkMuted }}>All systems operational</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "0 64px" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontSize: 22,
              letterSpacing: 2,
              color: C.onDarkMuted,
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
              color: C.onDark,
            }}
          >
            {profile.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              marginTop: 36,
              padding: "20px 28px",
              background: C.surface,
              border: `8px solid ${C.bronze}`,
              boxShadow: "8px 8px 0 rgba(0,0,0,0.5)",
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
