export default defineI18nConfig(() => ({
  legacy: false,
  // Korean is the product default. The active locale is then set at runtime
  // from the deployment currency (see app.vue). `fallbackLocale` stays "en" —
  // it is only the missing-translation-key safety net.
  locale: "ko",
  fallbackLocale: "en",
}));
