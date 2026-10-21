import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { themeInitScript } from "@/components/layout/theme";
import "./globals.css";

// Archivo variable (wdth 62–125, wght 100–900), self-hosted from
// @fontsource-variable/archivo (SIL Open Font License).
const archivo = localFont({
  src: "../../node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const metadata: Metadata = {
  title: {
    default: "FourthDown: fantasy football projections",
    template: "%s | FourthDown",
  },
  description:
    "Weekly PPR projections for running backs, receivers and tight ends from an XGBoost model, measured against a 3-week-average baseline.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#161b20" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
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
        <footer className="border-t border-rule">
          <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-8">
            <span>Player data from nflverse. PPR scoring, RB/WR/TE only.</span>
            <span>Projections are estimates, not advice.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
