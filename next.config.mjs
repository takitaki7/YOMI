/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Security + PWA-friendly headers. The service worker must not be cached so
  // updates roll out immediately; the manifest is safe to revalidate.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
