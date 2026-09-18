import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json higher up
  // the tree makes Next infer the wrong root, which breaks `tailwindcss`
  // resolution in PostCSS and crashes the dev server.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
