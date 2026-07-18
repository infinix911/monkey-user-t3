/**
 * Cloudflare Workers entry point for SPA routing
 * Serves static assets and falls back to index.html for client-side routes
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Try to fetch the asset from the static assets
    const response = await env.ASSETS.fetch(request);

    // If it's a successful response for an actual file, return it
    // Files have extensions like .js, .css, .png, etc.
    if (response.status === 200 && /\.\w+$/.test(pathname)) {
      return response;
    }

    // For SPA routes (no file extension) or 404s, serve index.html
    // This allows Vue Router to handle the routing on the client side
    if (response.status === 404 || !pathname.includes(".")) {
      const indexRequest = new Request(new URL("/index.html", request.url), {
        method: "GET",
        headers: request.headers,
      });
      return env.ASSETS.fetch(indexRequest);
    }

    // Return the original response for any other cases
    return response;
  },
};
