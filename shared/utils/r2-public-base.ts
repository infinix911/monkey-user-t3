/** Validate the public custom-domain origin; bucket and object paths are separate. */
export function r2PublicBase(value?: string): string {
  const base = value?.trim() || "https://assets.fr-7979.com";
  const message = "R2_PUBLIC_BASE_URL must be an HTTPS origin without credentials, path, query, or fragment";
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(message);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (base !== url.origin && base !== `${url.origin}/`)
  ) {
    throw new Error(message);
  }
  return url.origin;
}
