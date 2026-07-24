const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const INTERNAL_I18N_MESSAGES_ROUTE =
  /^\/_i18n\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\/messages\.json$/;

export interface CanonicalAuthority {
  authority: string;
  hostname: string;
  port: string;
}

/**
 * Nuxt i18n loads lazy locale messages during production SSR through Nitro's
 * in-process fetch adapter. That adapter uses `Host: localhost` and a mock
 * socket with no peer address. Keep this exception limited to the generated
 * public messages route so real requests still require an allowed authority.
 */
export function isTrustedInternalI18nRequest(
  rawHost: string | undefined,
  remoteAddress: string | undefined,
  pathname: string,
): boolean {
  return (
    rawHost?.trim().toLowerCase() === "localhost" &&
    !remoteAddress &&
    INTERNAL_I18N_MESSAGES_ROUTE.test(pathname)
  );
}

/** Parse a Host header without accepting credentials, paths, lists, or fragments. */
export function parseAuthority(raw: string | undefined): CanonicalAuthority | null {
  const value = raw?.trim().toLowerCase().replace(/\.$/, "");
  if (!value || value.length > 253 || /[\s,@/?#\\]/.test(value)) return null;

  try {
    const url = new URL(`http://${value}`);
    if (url.username || url.password || url.pathname !== "/") return null;
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!hostname || url.host.toLowerCase() !== value) return null;
    return { authority: url.host.toLowerCase(), hostname, port: url.port };
  } catch {
    return null;
  }
}

function parseAllowedEntry(raw: string): CanonicalAuthority | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.pathname !== "/" || url.search || url.hash)
      return null;
    return parseAuthority(url.host);
  } catch {
    return parseAuthority(value);
  }
}

/**
 * Resolve a request Host against explicitly configured authorities.
 * A hostname-only entry matches only the default port; non-default ports must
 * be listed explicitly. Development additionally permits local loopback hosts.
 */
export function resolveCanonicalAuthority(
  rawHost: string | undefined,
  configuredEntries: readonly string[],
  production: boolean,
): CanonicalAuthority | null {
  const candidate = parseAuthority(rawHost);
  if (!candidate) return null;

  const allowed = configuredEntries
    .flatMap((entry) => entry.split(","))
    .map(parseAllowedEntry)
    .filter((entry): entry is CanonicalAuthority => entry !== null);

  if (allowed.some((entry) => entry.authority === candidate.authority)) {
    return candidate;
  }

  if (!production && LOCAL_HOSTS.has(candidate.hostname)) return candidate;
  return null;
}

/** Validate and normalize Cloudflare/client address headers before forwarding. */
export function normalizeIpAddress(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value || value.length > 64 || /[\s,%]/.test(value)) return null;

  const v4 = value.startsWith("::ffff:") ? value.slice(7) : value;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(v4)) {
    return v4.split(".").every((part) => Number(part) <= 255) ? v4 : null;
  }

  try {
    const url = new URL(`http://[${value}]/`);
    return url.hostname.startsWith("[") ? value.toLowerCase() : null;
  } catch {
    return null;
  }
}
