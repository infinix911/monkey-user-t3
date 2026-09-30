/**
 * Deployed API base from a browser hostname — dependency-free on purpose.
 *
 * Lives apart from domain.ts (which re-exports it) because nuxt.config.ts
 * embeds this function's source in the theme-prefetch <head> script
 * (lib/theme-prefetch.ts); domain.ts uses Nuxt auto-imports that do not exist
 * in the config's Node type context.
 */

/** Build the deployed API base URL from the current browser hostname. */
export function getProductionApiBase(hostname: string): string {
  const labels = hostname.split('.');
  const rootDomain = labels.length > 2 ? labels.slice(1).join('.') : hostname;
  return `https://uapi.${rootDomain}/api`;
}
