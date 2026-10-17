/** Never cache degraded public data or an unknown tenant. */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event) => {
    if (event.context.userpageCacheTag) setResponseHeader(event, "X-Userpage-Cache-Tag", event.context.userpageCacheTag);
    if (event.context.userpageUpstreamFailed || event.node.res.statusCode >= 400) {
      setResponseHeader(event, "Cache-Control", "no-store");
      setResponseHeader(event, "X-Userpage-SSR-Degraded", "1");
    }
  });
});
