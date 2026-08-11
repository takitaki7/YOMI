import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const SITE_URL = siteUrl();
const TITLE = "YOMI — one Japanese word a day";
const DESCRIPTION =
  "A daily hiragana word game for Japanese learners. Spell one new word a day on the fifty-sounds keyboard, build a streak, and share your spoiler-free result.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "YOMI",
  keywords: [
    "Japanese",
    "hiragana",
    "learn Japanese",
    "daily word game",
    "wordle",
    "vocabulary",
    "kana",
    "nihongo",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YOMI",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "YOMI",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "YOMI — one Japanese word a day" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f1f3f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Privacy-friendly pageview analytics (DAU) when deployed on Vercel. */}
        <Analytics />
        {/* Register the service worker for offline / installable PWA. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
