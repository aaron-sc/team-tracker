import type { NextConfig } from "next";

// Header overriding rule (documented in this fork's headers() guide): when two entries match the
// same path and set the same key, the LATER entry wins. So the general clickjacking-protection
// rule below is deliberately listed before the /embed override, which relaxes it for the one
// route in this app that's meant to be iframed on third-party sites.
const nextConfig: NextConfig = {
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
