import type { NextConfig } from "next";

// Pe Vercel lăsăm Next.js în modul implicit: platforma își face singură
// împachetarea. Output-ul standalone (necesar doar imaginii Docker) mută
// build-ul astfel încât Vercel îl caută în rădăcina repo-ului, nu în
// director/ — de unde ENOENT pe .next/package.json la deploy.
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  ...(isVercel
    ? {}
    : {
        output: "standalone",
        // Aplicația are propriul package-lock; fără asta Next tratează
        // repo-ul părinte drept workspace root și imbrichează output-ul.
        outputFileTracingRoot: __dirname,
      }),
  images: {
    remotePatterns: [
      // Imaginile și clipurile din Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
