import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/add_friend', destination: 'http://127.0.0.1:5000/add_friend'
      },
    ];
  },
};

export default nextConfig;
