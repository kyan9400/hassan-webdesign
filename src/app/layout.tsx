import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { seo, siteUrl } from "@/data/site";
import { themeMotionScript } from "@/lib/head-script";
import { SkipLink } from "@/components/chrome/SkipLink";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";
import { Toaster } from "@/components/ui/Toast";
import { LiveRegion } from "@/components/ui/LiveRegion";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { ScrollChrome } from "@/components/chrome/ScrollChrome";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
  style: ["normal"],
  variable: "--font-fraunces",
});

// The italic (accent words, numerals) is a separate, larger file: it is not preloaded so it never
// competes with the hero text on first load; it swaps in a moment later.
const frauncesItalic = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  style: ["italic"],
  variable: "--font-fraunces-italic",
  preload: false,
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: seo.homeTitle, template: seo.titleTemplate },
  description: seo.homeDescription,
  applicationName: seo.siteName,
  authors: [{ name: "Alhassan Alfarran", url: "https://github.com/kyan9400" }],
  creator: "Alhassan Alfarran",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: seo.siteName,
    title: seo.homeTitle,
    description: seo.homeDescription,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.homeTitle,
    description: seo.homeDescription,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F7F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1712" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children, modal }: { children: ReactNode; modal?: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${fraunces.variable} ${frauncesItalic.variable} ${instrument.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeMotionScript }} />
      </head>
      <body>
        <SkipLink />
        <Nav />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        {modal}
        <Toaster />
        <LiveRegion />
        <RevealObserver />
        <ScrollChrome />
      </body>
    </html>
  );
}
