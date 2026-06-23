import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prevent clickjacking via iframe embedding
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Minimal referrer information across origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features this app does not use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Enable DNS prefetching for performance
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HSTS — 30-day max-age initially; increase to 2 years after validating in production
  {
    key: "Strict-Transport-Security",
    value: "max-age=2592000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
