import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { StatusBar } from "@/components/status-bar";
import { getProfile } from "@/lib/content";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://chetan-prod.vercel.app";

const description =
  "Chetan Gorantla: backend and distributed systems engineer who builds reliable services in cloud environments and enjoys teaching other engineers.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Chetan Gorantla · chetan-prod", template: "%s · chetan-prod" },
  description,
  openGraph: {
    title: "Chetan Gorantla · chetan-prod",
    description,
    url: "/",
    siteName: "chetan-prod",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#f5f2eb" };

export default function RootLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const { links } = getProfile();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${mono.variable}`}>
      <body className="flex min-h-dvh flex-col bg-bg font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <StatusBar links={links} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer links={links} />
        {modal}
      </body>
    </html>
  );
}
