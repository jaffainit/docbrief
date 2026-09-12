import type { NextConfig } from "next";

const ffmpegTrace = [
  "./node_modules/@ffmpeg-installer/linux-x64/**/*",
  "./node_modules/@ffmpeg-installer/ffmpeg/**/*",
  "./assets/fonts/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "sharp",
    "@ffmpeg-installer/ffmpeg",
    "@ffmpeg-installer/linux-x64",
  ],
  outputFileTracingIncludes: {
    "/api/**/*": ffmpegTrace,
    "/app/api/**/*": ffmpegTrace,
    "/api/projects/[id]/generate/**/*": ffmpegTrace,
    "/app/api/projects/[id]/generate/**/*": ffmpegTrace,
  },
};

export default nextConfig;
