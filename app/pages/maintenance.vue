<script setup lang="ts">
/**
 * Maintenance screen (user site).
 *
 * Shown to every visitor while the site is in maintenance mode. It renders
 * standalone (`layout: false`) so none of the usual header/nav/session chrome
 * appears, and it stays fully localized with a working language switcher — the
 * logo and brand name come from the live CMS site config, exactly as the header
 * renders them.
 *
 * The body copy defaults to the translated `maintenance.body` string; once the
 * admin `maintenance:message` site setting is wired, `customMessage` is the one
 * place to feed it in and it will override the default.
 */
import LanguageFlag from "~/components/layout/LanguageFlag.vue";

definePageMeta({ layout: false });

const { t, locale, locales, setLocale } = useI18n();
const siteConfig = useSiteConfig();

const localeCodes = computed(() =>
  (locales.value as Array<string | { code: string }>).map((l) =>
    typeof l === "string" ? l : l.code,
  ),
);

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  ko: "한국어",
  id: "Bahasa Indonesia",
  th: "ภาษาไทย",
};
const localeName = (code: string) => LOCALE_NAMES[code] ?? code;

const langOpen = ref(false);
async function chooseLocale(code: string) {
  langOpen.value = false;
  if (code !== locale.value) await setLocale(code as "en" | "ko");
}

// Admin-authored override from the `maintenance:message` site setting; falls
// back to the translated default when the admin hasn't set one.
const siteStore = useSiteStore();
const message = computed(
  () =>
    siteStore.siteSettings?.["maintenance:message"]?.trim() ||
    t("maintenance.body"),
);

function reload() {
  if (import.meta.client) window.location.reload();
}

useHead({ title: () => `${t("maintenance.title")} · ${siteConfig.identity?.siteName ?? ""}` });
</script>

<template>
  <div class="maint relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06070a] px-4 text-white">
    <!-- Ambient brand glow -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0"
      style="background:radial-gradient(60% 42% at 50% 0%, rgba(234,179,8,.16), transparent 70%), radial-gradient(90% 60% at 50% 120%, rgba(234,179,8,.05), transparent 60%)"
    />

    <!-- Language switcher -->
    <div class="absolute right-4 top-4 z-10">
      <div class="relative">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white transition hover:border-yellow-500/50 hover:bg-white/10"
          :aria-expanded="langOpen"
          aria-haspopup="true"
          @click="langOpen = !langOpen"
        >
          <LanguageFlag :code="(locale as 'en' | 'id' | 'ko' | 'th')" class="h-4 w-6 rounded-sm" />
          <span>{{ localeName(locale) }}</span>
          <svg
            class="h-3.5 w-3.5 opacity-60 transition-transform"
            :class="{ 'rotate-180': langOpen }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          ><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <div
          v-if="langOpen"
          class="absolute right-0 top-[calc(100%+6px)] min-w-[180px] rounded-xl border border-white/10 bg-[#0d0f14] p-1.5 shadow-2xl"
        >
          <button
            v-for="code in localeCodes"
            :key="code"
            type="button"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-200 transition hover:bg-yellow-500/15 hover:text-yellow-300"
            :class="{ 'font-bold text-yellow-300': code === locale }"
            @click="chooseLocale(code)"
          >
            <LanguageFlag :code="(code as 'en' | 'id' | 'ko' | 'th')" class="h-4 w-6 rounded-sm" />
            {{ localeName(code) }}
          </button>
        </div>
      </div>
    </div>

    <div class="relative w-full max-w-[460px] text-center">
      <!-- Logo (live CMS site logo, as in the header) -->
      <div class="mb-9 flex justify-center">
        <img
          v-if="siteConfig.identity?.logo"
          :src="siteConfig.identity.logo"
          :alt="siteConfig.identity?.siteName"
          class="h-9 w-auto object-contain"
        >
        <span v-else class="text-xl font-extrabold tracking-wide">{{ siteConfig.identity?.siteName }}</span>
      </div>

      <!-- Spinning cog -->
      <div class="relative mx-auto mb-7 grid h-28 w-28 place-items-center">
        <span class="absolute inset-0 rounded-full border border-yellow-500/20" />
        <span class="maint-pulse absolute inset-0 rounded-full border border-yellow-500/20" />
        <svg
          class="maint-spin h-14 w-14 text-yellow-500"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </div>

      <!-- Status chip -->
      <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-yellow-300">
        <span class="maint-blink h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_10px_#fde047]" />
        {{ t("maintenance.status") }}
      </div>

      <h1 class="mb-3.5 text-3xl font-extrabold tracking-tight sm:text-4xl">{{ t("maintenance.title") }}</h1>
      <p class="mx-auto mb-7 max-w-[40ch] text-[15px] leading-relaxed text-gray-400">{{ message }}</p>

      <button
        type="button"
        class="inline-flex items-center gap-2.5 rounded-xl bg-yellow-500 px-7 py-3.5 font-bold text-black transition hover:bg-yellow-600 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        @click="reload"
      >
        <svg
          class="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
        ><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
        {{ t("maintenance.retry") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.maint-spin { animation: maint-spin 9s linear infinite; }
.maint-pulse { animation: maint-pulse 2.6s ease-out infinite; }
.maint-blink { animation: maint-blink 1.5s ease-in-out infinite; }
@keyframes maint-spin { to { transform: rotate(360deg); } }
@keyframes maint-pulse { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(1.9); opacity: 0; } }
@keyframes maint-blink { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
@media (prefers-reduced-motion: reduce) {
  .maint-spin, .maint-pulse, .maint-blink { animation: none; }
}
</style>
