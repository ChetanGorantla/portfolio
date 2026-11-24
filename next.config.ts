import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build timestamp for the footer's deploy stamp.
  env: { BUILD_TIME: new Date().toISOString() },
};

export default nextConfig;
