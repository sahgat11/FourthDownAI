// Absolute site URL for metadata, Open Graph images and the sitemap.
// Set NEXT_PUBLIC_SITE_URL for a custom domain; on Vercel the production
// URL is filled in automatically.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
