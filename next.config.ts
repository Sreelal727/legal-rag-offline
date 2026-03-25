import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["word-extractor", "mammoth", "pdf-parse", "better-sqlite3"],
};

export default nextConfig;
