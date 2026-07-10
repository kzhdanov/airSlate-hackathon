import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist resolves its worker at runtime — keep it out of the bundle
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
