const LOCALHOST_SITE_URL = "http://localhost:3000";

function normalizeUrl(value?: string | null): URL | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

export function getConfiguredSiteUrl() {
  return (
    normalizeUrl(process.env.AUTH_URL) ??
    normalizeUrl(process.env.NEXTAUTH_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeUrl(process.env.VERCEL_URL) ??
    null
  );
}

export function getSiteMetadataBase() {
  return getConfiguredSiteUrl() ?? new URL(LOCALHOST_SITE_URL);
}

export function getServerActionAllowedOrigins() {
  const allowedOrigins = new Set<string>(["localhost:3000", "127.0.0.1:3000"]);
  const configuredSiteUrl = getConfiguredSiteUrl();

  if (configuredSiteUrl) {
    allowedOrigins.add(configuredSiteUrl.host);
  }

  const extraOrigins =
    process.env.SERVER_ACTIONS_ALLOWED_ORIGINS?.split(",") ?? [];

  for (const origin of extraOrigins) {
    const trimmedOrigin = origin.trim();

    if (!trimmedOrigin) {
      continue;
    }

    const normalizedOrigin = normalizeUrl(trimmedOrigin);

    if (normalizedOrigin) {
      allowedOrigins.add(normalizedOrigin.host);
      continue;
    }

    allowedOrigins.add(trimmedOrigin);
  }

  return Array.from(allowedOrigins);
}
