/**
 * Deployed API base from a browser hostname — dependency-free on purpose.
 *
 * Lives apart from domain.ts (which re-exports it) because both SSR and browser requests must use the same API routing rules.
 */

/** Build the deployed API base URL from the current browser hostname. */
export function getProductionApiBase(hostname: string): string {
  const labels = hostname.split('.');
  const rootDomain = labels.length > 2 ? labels.slice(1).join('.') : hostname;
  return `https://uapi.${rootDomain}/api`;
}
