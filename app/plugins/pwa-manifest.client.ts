/**
 * Dynamic PWA Manifest Plugin
 *
 * Replaces the static manifest.webmanifest (generated at build time for a single site)
 * with a dynamically generated manifest based on the current domain's site config.
 * This allows multiple demo sites sharing the same build to each have correct PWA icons/name.
 */
export default defineNuxtPlugin(() => {
  // Manifest install is non-critical for first paint — defer until the
  // browser is idle so JSON.stringify, Blob construction, and DOM injection
  // don't compete with hydration / LCP.
  onNuxtReady(() => {
    const siteConfig = useSiteConfig();

    const name = siteConfig.identity?.siteName || "Banana";
    const icons = siteConfig.assets?.icons?.pwa || {};
    const themeColor = siteConfig.theme?.themeColor || "#0f172a";

    const manifest = {
      name,
      short_name: name,
      description: `Experience the best online gaming experience with ${name}`,
      theme_color: themeColor,
      background_color: "#ffffff",
      display: "standalone",
      start_url: "/",
      lang: "en",
      icons: Object.entries(icons).map(([sizes, src]) => ({
        src: src as string,
        sizes,
        type: "image/png",
      })),
    };

    const blob = new Blob([JSON.stringify(manifest)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const existing = document.querySelector('link[rel="manifest"]');
    if (existing) {
      existing.setAttribute("href", url);
    } else {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = url;
      document.head.appendChild(link);
    }
  });
});
