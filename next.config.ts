import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  allowedDevOrigins: ["localhost", "127.0.0.1", "10.131.152.213"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qgztehnwwsjdutqavenu.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/FlowerDB/images/:dir/:filename([^/\\.]+)\\.:ext(jpg|jpeg|png|JPG|JPEG|PNG)",
        destination: "https://qgztehnwwsjdutqavenu.supabase.co/storage/v1/object/public/designs/assets/:filename%5Fprocessed.png",
        permanent: false,
      },
      {
        source: "/FlowerDB_nobg/images/:filename([^/\\.]+)\\.:ext(jpg|jpeg|png|JPG|JPEG|PNG)",
        destination: "https://qgztehnwwsjdutqavenu.supabase.co/storage/v1/object/public/designs/assets/:filename%5Fprocessed.png",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
