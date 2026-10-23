import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { themeInitScript } from "@/components/layout/theme";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Self-hosted from Fontsource (all SIL Open Font License):
// Barlow for reading text, Big Shoulders Display for headlines and stat
// numerals, Graduate (varsity block lettering) for the wordmark only.
const barlow = localFont({
  src: [
    { path: "../../node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/barlow/files/barlow-latin-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff2", weight: "600" },
    { path: "../../node_modules/@fontsource/barlow/files/barlow-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-barlow",
  display: "swap",
});
const bigShoulders = localFont({
  src: "../../node_modules/@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2",
  variable: "--font-big-shoulders",
  weight: "100 900",
  display: "swap",
});
const graduate = localFont({
  src: "../../node_modules/@fontsource/graduate/files/graduate-latin-400-normal.woff2",
  variable: "--font-graduate",
  weight: "400",
  display: "swap",
});

const description =
  "Weekly PPR projections for running backs, receivers and tight ends from an XGBoost model, measured against a 3-week-average baseline.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FourthDown: fantasy football projections",
    template: "%s | FourthDown",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "FourthDown",
    title: "FourthDown: fantasy football projections",
    description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e1c36" },
    { media: "(prefers-color-scheme: dark)", color: "#08111f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${bigShoulders.variable} ${graduate.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-8 sm:px-8 sm:py-12">
          {children}
        </main>
        <footer className="bg-header">
          <div aria-hidden className="varsity-stripe" />
          <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-2 px-4 py-6 text-sm text-header-ink-2 sm:px-8">
            <span>Player data from nflverse. PPR scoring, RB/WR/TE only.</span>
            <span>Projections are estimates, not advice.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
