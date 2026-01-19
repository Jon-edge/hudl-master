import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**"
      },
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
      },
      {
        protocol: "https",
        hostname: "edgecontent.nyc3.digitaloceanspaces.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "content.edge.app",
        pathname: "/**"
      }
    ]
  }
}

export default nextConfig
