import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Aplicația are propriul package-lock; fără asta Next tratează repo-ul
  // părinte drept workspace root și imbrichează output-ul standalone.
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      // Imaginile și clipurile din Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
