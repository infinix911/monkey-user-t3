/**
 * Serve i18n messages from the bundle instead of fetching them per page load.
 *
 * ## The problem
 *
 * `@nuxtjs/i18n` v10 keeps messages behind a Nitro route and, in a production
 * SSR build, the client always resolves them through it:
 *
 * ```js
 * // context.js — loadMessages()
 * return ctx.dynamicResourcesSSG || import.meta.dev
 *   ? await loadMessagesFromClient(locale)   // bundled import
 *   : await loadMessagesFromServer(locale);  // $fetch /_i18n/<hash>/<locale>/messages.json
 * ```
 *
 * `dynamicResourcesSSG` is false whenever `ssr: true` and the build is not
 * prerendered, so every visit downloaded `/_i18n/<hash>/ko/messages.json`
 * (~74 kB, `max-age=10` in production) during hydration — the request the
 * network tab kept showing.
 *
 * `experimental.preload` does NOT fix this. It inlines the messages into the
 * HTML, but `loadAndSetLocale()` still calls `ctx.loadMessages()`
 * unconditionally and `loadMessages()` never consults `ctx.preloaded` — the
 * only early return is `nuxt.isHydrating && loadMap.has(locale)`, and nothing
 * seeds `loadMap` on the client. Verified against the shipped 10.3/10.5 source.
 *
 * ## The fix
 *
 * Replace `ctx.loadMessages` with one that merges the statically imported
 * locale JSON. The bundler already emits these files for the client, so this
 * mostly reuses chunks that were being shipped anyway.
 *
 * The patch is installed from the `i18n:beforeLocaleSwitch` hook rather than
 * directly in `setup()`. That hook is awaited inside `loadAndSetLocale()`
 * immediately *before* `ctx.loadMessages()` runs, which sidesteps plugin
 * ordering entirely: this file only has to register the hook before the module
 * plugins run (`enforce: "pre"`), not to run between two of them. The i18n
 * context also exists by then, which it does not during a `pre` setup.
 *
 * Server-side rendering is untouched — it keeps using the endpoint (an internal,
 * peerless call that `server/middleware/00-validate-host.ts` whitelists), so
 * translations still render in SSR HTML exactly as before.
 */
import en from "../../i18n/locales/en.json";
import ko from "../../i18n/locales/ko.json";

type LocaleMessages = Record<string, unknown>;

const BUNDLED_MESSAGES: Record<string, LocaleMessages> = { en, ko };

/** The parts of the module's internal context this plugin touches. */
interface NuxtI18nContext {
  loadMessages: (locale: string) => Promise<void>;
  __bundledMessagesPatched?: boolean;
}

export default defineNuxtPlugin({
  name: "i18n:bundled-messages",
  enforce: "pre",
  setup(nuxtApp) {
    nuxtApp.hook("i18n:beforeLocaleSwitch", () => {
      const ctx = (nuxtApp as unknown as { _nuxtI18n?: NuxtI18nContext })
        ._nuxtI18n;
      if (!ctx || ctx.__bundledMessagesPatched) return;
      ctx.__bundledMessagesPatched = true;

      ctx.loadMessages = async (locale: string) => {
        const messages = BUNDLED_MESSAGES[locale];
        // An unknown locale falls through to no-op rather than to the network:
        // only the two configured locales can ever be set (`isSupportedLocale`
        // gates the caller), so there is nothing legitimate left to fetch.
        if (!messages) return;
        nuxtApp.$i18n.mergeLocaleMessage(locale, messages);
      };
    });
  },
});
