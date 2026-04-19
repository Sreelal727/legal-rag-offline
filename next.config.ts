import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "word-extractor",
    "mammoth",
    "pdf-parse",
    "better-sqlite3",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "tesseract.js",
  ],
  // Increase body size limits for document uploads (merged PDFs can be 150MB+)
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
