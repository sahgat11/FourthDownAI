# FourthDown frontend

Next.js site for FourthDown. See the [project README](../README.md) for the full picture.

```bash
npm ci
npm run dev              # http://localhost:3000
npm run lint
npm run build
npm run test:e2e:build   # build, then run Playwright (first time: npx playwright install chromium)
```

The site reads model output from `public/data/*.json`, written by `backend/precompute.py`. Types for those files live in `src/lib/types.ts` and mirror [`backend/DATA_SCHEMA.md`](../backend/DATA_SCHEMA.md). `/design` shows the design system (not linked from the nav, not indexed).

Set `NEXT_PUBLIC_SITE_URL` when using a custom domain; on Vercel the production URL is picked up automatically for social previews and the sitemap.
