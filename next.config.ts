import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  allowedDevOrigins: ["localhost", "127.0.0.1", "10.131.152.213"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qjshekkscvghlzhpkzju.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/FlowerDB/images/:dir/:filename([^/\\.]+)\\.:ext(jpg|jpeg|png|JPG|JPEG|PNG)",
        destination: "https://qjshekkscvghlzhpkzju.supabase.co/storage/v1/object/public/designs/assets/:filename%5Fprocessed.png",
      },
      {
        source: "/FlowerDB_nobg/images/:filename([^/\\.]+)\\.:ext(jpg|jpeg|png|JPG|JPEG|PNG)",
        destination: "https://qjshekkscvghlzhpkzju.supabase.co/storage/v1/object/public/designs/assets/:filename%5Fprocessed.png",
      },
    ];
  },
};

export default nextConfig;
