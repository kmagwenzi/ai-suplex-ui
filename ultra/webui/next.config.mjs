/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the build tracing rooted at this app — the monorepo holds a sibling
  // aionui/ package and the nested lib/enrich manifest whose lockfiles must not
  // over-trace the ultra-webui build.
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  // NOTE: static export is not set — the artifact route reads fs on the Node runtime.
};

export default nextConfig;
