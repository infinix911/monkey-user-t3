/** Launch URLs need browser credentials and never enter the public SSR cache. */
export default defineEventHandler((event) => {
  if (/^\/(?:slot|casino|sport|sports|mini|fishing|cockfight|card|etc|horse|lotto|virtual)\/[^/]+\/?$/i.test(getRequestURL(event).pathname)) {
    event.context.nuxt ??= {};
    event.context.nuxt.noSSR = true;
  }
});
