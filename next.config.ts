import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "ca.slack-edge.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "**.slack-edge.com",
        pathname: "/**"
      }
    ]
  }
}

export default nextConfig
