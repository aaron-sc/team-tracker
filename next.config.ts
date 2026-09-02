import type { NextConfig } from "next";

// Header overriding rule (documented in this fork's headers() guide): when two entries match the
// same path and set the same key, the LATER entry wins. So the general clickjacking-protection
// rule below is deliberately listed before the /embed override, which relaxes it for the one
// route in this app that's meant to be iframed on third-party sites.
const nextConfig: NextConfig = {
  experimental: {
    // Powers React's native <ViewTransition> (see components using it, e.g. app/[orgSlug]/layout.tsx)
    // — the app's route-change crossfade and the roster list→detail morph both depend on this.
    viewTransition: true,
  },
  // discord.js's gateway package (@discordjs/ws) lazily `import()`s the optional native module
  // zlib-sync, which isn't installed (it's an optional perf dependency, not required). Turbopack
  // tries to statically resolve every import when bundling for Server Components and fails on it
  // — externalizing discord.js makes it a plain Node require() at runtime instead, which resolves
  // that dynamic import lazily and only if the module is actually present.
  serverExternalPackages: ["discord.js"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // Public roster embed — meant to be framed by an org's own website, so it needs the
        // opposite policy from every other route. Per spec, CSP's frame-ancestors takes full
        // precedence over X-Frame-Options in any browser that understands it, so overriding just
        // this one is enough — there's no valid X-Frame-Options value that means "allow all"
        // (only DENY/SAMEORIGIN are real), so it's left unset here rather than set to something
        // meaningless; the general rule's SAMEORIGIN would otherwise still apply underneath.
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
};

export default nextConfig;
