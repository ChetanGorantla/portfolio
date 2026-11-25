import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Silkscreen } from "next/font/google";
import type { ReactNode } from "react";
import { IncidentClickGuard } from "@/components/drawer";
import { EngineRoom } from "@/components/engine-room/engine-room";
import { Footer } from "@/components/footer";
import { StatusBar } from "@/components/status-bar";
import { getProfile } from "@/lib/content";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });
const pixel = Silkscreen({ weight: "400", subsets: ["latin"], variable: "--font-silkscreen", display: "swap" });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://chetan-prod.vercel.app";

const description =
  "Chetan Gorantla: backend and distributed systems engineer who builds reliable services in cloud environments and enjoys teaching other engineers.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Chetan Gorantla", template: "%s · Chetan Gorantla" },
  description,
  openGraph: {
    title: "Chetan Gorantla",
    description,
    url: "/",
    siteName: "Chetan Gorantla",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#191814" };

export default function RootLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const { name, links } = getProfile();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${mono.variable} ${pixel.variable}`}>
      <body className="flex min-h-dvh flex-col bg-bg font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <EngineRoom />
        <StatusBar name={name} links={links} />
        <main id="main" className="relative z-10 flex-1">
          {children}
        </main>
        <Footer links={links} />
        {modal}
        <IncidentClickGuard />
        <Analytics />
      </body>
    </html>
  );
}
