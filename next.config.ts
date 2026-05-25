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
};

export default nextConfig;
