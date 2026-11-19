/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the build tracing rooted at this app — the monorepo holds a sibling
  // aionui/ package whose lockfile must not over-trace the lean-webui build.
  outputFileTracingRoot: process.cwd(),
  // A verification build must never fight a running dev server for .next —
  // that collision is what served 500s on every route (2026-11-18).
  // Builds pass NEXT_DIST_DIR to write elsewhere; dev keeps .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The desktop shell ships this app's own server, so the build has to emit a
  // self-contained one. Gated on an env var because a standalone build is a
  // release artefact, not the dev loop — dev and verification builds stay lean.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  reactStrictMode: true,
};

export default nextConfig;
