import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const basePath = process.env.IS_DEMO === "1" ? "/demo" : "";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    hostname: "avatar.vercel.sh",
  },
];

const seaweedFsPublicBaseUrl = process.env.SEAWEEDFS_PUBLIC_BASE_URL?.trim();

if (seaweedFsPublicBaseUrl) {
  const url = new URL(seaweedFsPublicBaseUrl);
  const pathname =
    url.pathname === "/" ? "/**" : `${url.pathname.replace(/\/$/, "")}/**`;

  remotePatterns.push({
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    port: url.port,
    pathname,
  });
}

const nextConfig: NextConfig = {
  ...(basePath
    ? {
        basePath,
        assetPrefix: "/demo-assets",
        redirects: async () => [
          {
            source: "/",
            destination: basePath,
            permanent: false,
            basePath: false,
          },
        ],
      }
    : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  cacheComponents: true,
  devIndicators: false,
  poweredByHeader: false,
  reactCompiler: true,
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
  images: {
    remotePatterns,
  },
  experimental: {
    prefetchInlining: true,
    cachedNavigations: true,
    appNewScrollHandler: true,
    inlineCss: true,
    turbopackFileSystemCacheForDev: true,
  },
};

export default withBotId(nextConfig);
