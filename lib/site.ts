/**
 * Canonical site URL, resolved server-side at build/runtime. Prefers an
 * explicit override, then Vercel's injected production/deploy URL, then the
 * known production domain. Used for metadata, robots, and the sitemap.
 */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://yomi-ten-wheat.vercel.app";
}
