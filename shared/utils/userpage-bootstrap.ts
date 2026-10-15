/** Public, PostgreSQL-derived CMS snapshot. Site settings intentionally stay out. */
export interface CustomScriptEntry {
  id: number;
  title: string;
  script: string;
}

export interface UserpageBootstrap {
  version: string | number;
  updatedAt: string;
  siteCode: string;
  theme: Record<string, unknown> | null;
  customScripts: CustomScriptEntry[];
}

export interface WindowSiteBootstrap extends UserpageBootstrap {
  customScriptsInjected: boolean;
}

export const SITE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** One independently published hostname lookup in the shared KV namespace. */
export interface UserpageDomainRecord {
  publisherId: string;
  siteCode: string;
}

export function isUserpageDomainRecord(value: unknown): value is UserpageDomainRecord {
  return isRecord(value)
    && typeof value.publisherId === "string" && /^[a-z0-9][a-z0-9-]{0,62}$/.test(value.publisherId)
    && typeof value.siteCode === "string" && SITE_CODE_PATTERN.test(value.siteCode);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function hasSafeThemeKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(hasSafeThemeKeys);
  if (!isRecord(value)) return true;
  return Object.entries(value).every(([key, child]) => !BLOCKED_KEYS.has(key) && hasSafeThemeKeys(child));
}

/** Reject malformed or cross-group snapshots before using any public content. */
export function isUserpageBootstrap(value: unknown, siteCode?: string): value is UserpageBootstrap {
  try {
    if (!isRecord(value)) return false;
    return typeof value.siteCode === "string" && SITE_CODE_PATTERN.test(value.siteCode)
      && (siteCode === undefined || value.siteCode === siteCode)
      && ((typeof value.version === "string" && value.version.length > 0) || (typeof value.version === "number" && Number.isFinite(value.version)))
      && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
      && (value.theme === null || isRecord(value.theme) && hasSafeThemeKeys(value.theme))
      && Array.isArray(value.customScripts)
      && value.customScripts.every((entry: unknown) => isRecord(entry)
        && typeof entry.id === "number" && Number.isSafeInteger(entry.id) && entry.id > 0
        && typeof entry.title === "string" && typeof entry.script === "string");
  } catch {
    // Malformed/cyclic window values must not prevent client API fallback.
    return false;
  }
}

/** Mirror the frontend's existing trusted-admin inline-only snippet parsing. */
export function extractScriptBodies(raw: string): string[] {
  if (!raw) return [];
  const pattern = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
  const bodies: string[] = [];
  let match: RegExpExecArray | null;
  let foundAny = false;
  while ((match = pattern.exec(raw)) !== null) {
    foundAny = true;
    const inner = (match[1] ?? "").trim();
    if (inner) bodies.push(inner);
  }
  if (!foundAny && raw.trim()) bodies.push(raw.trim());
  return bodies;
}

/** Match the existing recursive mixed-content protection. */
export function enforceThemeHttps(value: unknown): unknown {
  if (typeof value === "string") return value.startsWith("http://") ? value.replace("http://", "https://") : value;
  if (Array.isArray(value)) return value.map(enforceThemeHttps);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !BLOCKED_KEYS.has(key)).map(([key, child]) => [key, enforceThemeHttps(child)]));
  }
  return value;
}
