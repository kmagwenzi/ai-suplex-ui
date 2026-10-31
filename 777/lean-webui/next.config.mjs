/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the build tracing rooted at this app — the monorepo holds a sibling
  // aionui/ package whose lockfile must not over-trace the lean-webui build.
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
};

export default nextConfig;
