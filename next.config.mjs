/** @type {import('next').NextConfig} */
const nextConfig = {
  // A fully static build: the website and the app are plain files that any
  // host (or a phone's cache, via the service worker) can serve.
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
