/** Public CMS script data and browser theme helpers. */
export interface CustomScriptEntry {
  id: number;
  title: string;
  script: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

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
