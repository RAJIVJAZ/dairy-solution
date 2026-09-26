/** @type {import('next').NextConfig} */
// Set when the site is served from a sub-path, e.g. GitHub Pages at /dairy-solution.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig = {
  basePath,
  // A fully static build: the website and the app are plain files that any
  // host (or a phone's cache, via the service worker) can serve.
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
