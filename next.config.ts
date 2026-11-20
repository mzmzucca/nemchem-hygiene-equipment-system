import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Bundle the seeded SQLite database and Prisma schema/engines into every
  // serverless function so demo data works on Vercel and Netlify.
  outputFileTracingIncludes: {
    "/**": ["./prisma/**"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
