import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "sharp",
    "@ffmpeg-installer/ffmpeg",
    "@ffmpeg-installer/linux-x64",
  ],
};

export default nextConfig;
