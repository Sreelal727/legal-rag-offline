import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["word-extractor", "mammoth", "pdf-parse"],
};

export default nextConfig;
