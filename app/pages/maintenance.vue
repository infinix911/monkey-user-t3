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
 * Every colour comes from the active theme (`useSiteConfig()`), fed in as CSS
 * custom properties on the root element:
 *   - page:   `theme.bodyBgColor` + `assets.images.mainBackground`, framed by
 *             a body-colour vignette
 *   - accent: `theme.panel.actionColor` — the account panels' accent. Used
 *             instead of `theme.brandColor` because some themes ship a white
 *             brandColor, which reads as no accent at all. It lights the
 *             card frame + halo, the status chip, the feature icons and the
 *             button, and re-hues the artwork (a `color`-blend tint over
 *             public/designs/misc/maintenance-art-neutral.webp, a greyscale crop —
 *             the art carries only shading; all of its colour is the tint).
 * The card is dark glass in the body colour. The artwork is referenced by its
 * local path, not `cdn()`: the CDN bucket only mirrors files uploaded to it.
 *
 * `/api/site/*` stays reachable during maintenance (monkey-user-api ADR-016),
 * so the CMS theme loads normally. Until it has resolved (prefetch, warm cache,
 * or the bootstrap fetch settling) the content stays invisible over the page
 * background, so the bundled default theme never flashes.
 *
 * The body copy defaults to the translated `maintenance.body` string; the admin
 * `maintenance:message` site setting overrides it. No completion time is shown —
 * the API exposes none.
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
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") langOpen.value = false;
}

// Admin-authored override from the `maintenance:message` site setting; falls
// back to the translated default when the admin hasn't set one.
const siteStore = useSiteStore();
const message = computed(
  () =>
    siteStore.siteSettings?.["maintenance:message"]?.trim() ||
    t("maintenance.body"),
);

// The CMS theme is "settled" once it has been applied (prefetch / warm cache)
// or app.vue's bootstrap fetch has finished — success or bundled fallback.
const rawConfig = useState<unknown>("userPageConfig", () => null);
const bootstrapReady = useState("siteConfigBootstrapReady", () => false);
const themeReady = computed(() => !!rawConfig.value || bootstrapReady.value);

/** Black or white, whichever reads better on a hex background. */
function inkFor(color: string): string {
  const hex = color.trim().replace("#", "");
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return "#000";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
  return luminance > 0.4 ? "#000" : "#fff";
}

const themeVars = computed(() => {
  const theme = siteConfig.theme;
  const accent = theme.panel.actionColor || theme.brandColor;
  return {
    "--m-bg": theme.bodyBgColor,
    "--m-accent": accent,
    "--m-accent-ink": inkFor(accent),
  };
});

const background = computed(() => siteConfig.assets.images.mainBackground);
const backgroundOnMobile = computed(() => siteConfig.assets.images.mainBackgroundMobile);

/** Solid cog (evenodd hub) — the status chip icon. */
const GEAR_PATH =
  "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z";

/** Bottom feature row — label key under `maintenance.features` + icon path. */
const FEATURES = [
  { key: "stable", icon: "M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 2.2 6 2.25V11c0 4-2.6 7.8-6 8.9V4.2Z" },
  { key: "improved", icon: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z" },
  { key: "better", icon: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" },
] as const;

function reload() {
  if (import.meta.client) window.location.reload();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

useHead({ title: () => `${t("maintenance.title")} · ${siteConfig.identity?.siteName ?? ""}` });
</script>

<template>
  <div
    class="maint relative isolate flex min-h-dvh w-full flex-col overflow-hidden text-white"
    :style="themeVars"
  >
    <!-- ── Backdrop: theme art framed by a body-colour vignette ─────────── -->
    <div
      v-if="themeReady && background"
      aria-hidden="true"
      class="maint-bg pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      :class="backgroundOnMobile ? '' : 'hidden md:block'"
      :style="{ backgroundImage: `url(${background})` }"
    />
    <div
      aria-hidden="true"
      class="maint-vignette maint-fade pointer-events-none absolute inset-0 -z-10"
      :class="{ 'opacity-0': !themeReady }"
    />

    <!-- ── Top bar ─────────────────────────────────────────────────────── -->
    <!-- Same side padding + max width as <main>, so the logo and switcher line
         up with the card's left and right edges. -->
    <header
      class="maint-fade relative z-20 w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8"
      :class="{ 'opacity-0': !themeReady }"
    >
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <div class="min-w-0">
          <img
            v-if="siteConfig.identity?.logo"
            :src="siteConfig.identity.logo"
            :alt="siteConfig.identity?.siteName"
            class="h-8 w-auto max-w-[150px] object-contain sm:h-10 sm:max-w-[220px]"
          >
          <span v-else class="block truncate text-2xl font-black tracking-wide">
            {{ siteConfig.identity?.siteName }}
          </span>
        </div>

        <div class="relative shrink-0">
          <button
            type="button"
            class="maint-pill maint-focus inline-flex h-10 items-center gap-2.5 rounded-full px-4 text-sm font-medium text-white/90 transition hover:text-white"
            :aria-expanded="langOpen"
            aria-haspopup="true"
            @click="langOpen = !langOpen"
          >
            <LanguageFlag :code="(locale as 'en' | 'id' | 'ko' | 'th')" class="h-3.5 w-5 rounded-[3px]" />
            <span class="hidden sm:inline">{{ localeName(locale) }}</span>
            <svg
              class="h-3.5 w-3.5 opacity-70 transition-transform"
              :class="{ 'rotate-180': langOpen }"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
            ><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <!-- Click-away catcher -->
          <button
            v-if="langOpen"
            type="button"
            tabindex="-1"
            aria-hidden="true"
            class="fixed inset-0 z-0 cursor-default"
            @click="langOpen = false"
          />
          <Transition name="maint-pop">
            <div
              v-if="langOpen"
              class="maint-menu absolute right-0 top-[calc(100%+8px)] z-10 min-w-[176px] origin-top-right rounded-2xl p-1.5"
            >
              <button
                v-for="code in localeCodes"
                :key="code"
                type="button"
                class="maint-focus flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                :class="{ 'maint-accent font-semibold': code === locale }"
                @click="chooseLocale(code)"
              >
                <LanguageFlag :code="(code as 'en' | 'id' | 'ko' | 'th')" class="h-3.5 w-5 rounded-[3px]" />
                <span class="flex-1 text-left">{{ localeName(code) }}</span>
                <svg
                  v-if="code === locale"
                  class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                ><path d="M20 6 9 17l-5-5" /></svg>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <!-- ── Card: copy + artwork (stacked on mobile, split on lg) + features ── -->
    <main
      class="maint-fade relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-6 lg:px-8"
      :class="{ 'opacity-0': !themeReady }"
    >
      <section
        class="maint-card w-full max-w-6xl rounded-[28px] px-5 pb-6 pt-8 sm:rounded-[32px] sm:px-10 sm:pb-8 sm:pt-12 lg:px-16 lg:pt-14"
        aria-labelledby="maint-title"
      >
        <div class="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-4">
          <!-- Artwork, re-hued to the theme accent by the tint layer -->
          <div class="maint-art relative mx-auto w-full max-w-[400px] sm:max-w-[480px] lg:order-2 lg:max-w-none">
            <img
              src="/designs/misc/maintenance-art-neutral.webp"
              alt=""
              width="608"
              height="448"
              decoding="async"
              class="block h-auto w-full"
            >
            <span aria-hidden="true" class="maint-art-tint absolute inset-0" />
          </div>

          <div class="text-center lg:order-1 lg:text-left">
            <div class="mb-6 flex items-center justify-center gap-3 lg:justify-start">
              <p class="maint-chip inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-bold sm:text-base">
                <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" :d="GEAR_PATH" />
                </svg>
                <span class="truncate">{{ t("maintenance.status") }}</span>
              </p>
              <span aria-hidden="true" class="maint-spark hidden h-px w-24 sm:block" />
            </div>
            <h1
              id="maint-title"
              class="maint-title mb-5 text-[30px] font-extrabold leading-[1.2] tracking-tight break-keep sm:text-[42px] lg:text-[50px]"
            >
              {{ t("maintenance.title") }}
            </h1>
            <p class="mx-auto mb-9 max-w-[42ch] text-[15px] leading-[1.8] text-white/70 break-keep sm:text-[17px] lg:mx-0">
              {{ message }}
            </p>

            <button
              type="button"
              class="maint-cta maint-focus inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full px-9 text-lg font-bold active:scale-[0.98] sm:w-auto"
              @click="reload"
            >
              <svg
                class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
              ><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
              {{ t("maintenance.retry") }}
              <svg
                class="h-4 w-4 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
              ><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        <ul class="maint-features mt-8 flex flex-col items-center gap-3 border-t pt-6 text-sm text-white/80 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-y-3 lg:mt-6">
          <li
            v-for="(feature, i) in FEATURES"
            :key="feature.key"
            class="flex items-center gap-2.5 break-keep sm:px-6"
            :class="{ 'maint-sep sm:border-l': i > 0 }"
          >
            <svg class="maint-accent h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path :d="feature.icon" />
            </svg>
            {{ t(`maintenance.features.${feature.key}`) }}
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.maint { background-color: var(--m-bg); }

/* Theme background art, kept visible, framed by a vignette in the body colour
   plus a faint accent wash so themes without art still get atmosphere. */
.maint-bg { opacity: .75; }
.maint-vignette {
  background:
    radial-gradient(120% 90% at 50% 45%, transparent 35%, color-mix(in srgb, var(--m-bg) 85%, transparent) 100%),
    radial-gradient(60% 50% at 75% 45%, color-mix(in srgb, var(--m-accent) 14%, transparent), transparent 70%),
    linear-gradient(to bottom, color-mix(in srgb, var(--m-bg) 35%, transparent), transparent 30%, transparent 70%, color-mix(in srgb, var(--m-bg) 70%, transparent));
}

.maint-pill {
  background: color-mix(in srgb, var(--m-bg) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--m-accent) 45%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Card: dark glass with a thin accent frame and a soft accent halo. */
.maint-card {
  background:
    radial-gradient(70% 90% at 78% 50%, color-mix(in srgb, var(--m-accent) 10%, transparent), transparent 70%),
    linear-gradient(135deg, color-mix(in srgb, var(--m-bg) 72%, transparent), color-mix(in srgb, var(--m-bg) 88%, transparent));
  border: 1px solid color-mix(in srgb, var(--m-accent) 55%, transparent);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, .03) inset,
    0 0 50px -12px color-mix(in srgb, var(--m-accent) 45%, transparent),
    0 40px 100px -30px rgba(0, 0, 0, .8);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.maint-chip {
  color: var(--m-accent);
  background: color-mix(in srgb, var(--m-accent) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--m-accent) 65%, transparent);
}
/* Thin line ending in a glowing point, trailing the chip. */
.maint-spark {
  position: relative;
  background: linear-gradient(to right, color-mix(in srgb, var(--m-accent) 60%, transparent), transparent);
}
.maint-spark::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 70%;
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  translate: 0 -50%;
  background: color-mix(in srgb, var(--m-accent) 50%, #fff);
  box-shadow: 0 0 10px 2px var(--m-accent);
}

.maint-title { text-shadow: 0 2px 24px rgba(0, 0, 0, .35); }

.maint-cta {
  background: linear-gradient(180deg, color-mix(in srgb, var(--m-accent) 70%, #fff), var(--m-accent) 55%, color-mix(in srgb, var(--m-accent) 85%, #000));
  color: var(--m-accent-ink);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .45),
    0 0 0 1px color-mix(in srgb, var(--m-accent) 60%, transparent),
    0 0 30px -4px color-mix(in srgb, var(--m-accent) 75%, transparent);
  transition: filter .2s ease, transform .2s ease;
}
.maint-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }

/* Artwork: the reference illustration re-hued to the theme accent. The tint's
   `color` blend keeps the art's luminance (all its shading) and takes hue +
   saturation from the accent; `lighten` drops the art's dark backdrop into the
   card, and the mask feathers the crop's edges. */
.maint-art {
  isolation: isolate;
  mix-blend-mode: lighten;
  -webkit-mask-image:
    linear-gradient(to right, transparent, #000 14%, #000 90%, transparent),
    linear-gradient(to bottom, transparent, #000 10%, #000 86%, transparent);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent, #000 14%, #000 90%, transparent),
    linear-gradient(to bottom, transparent, #000 10%, #000 86%, transparent);
  mask-composite: intersect;
}
.maint-art-tint {
  background: var(--m-accent);
  mix-blend-mode: color;
}

.maint-features { border-color: color-mix(in srgb, var(--m-accent) 22%, transparent); }
.maint-sep { border-color: rgba(255, 255, 255, .14); }
.maint-fade { transition: opacity .4s ease; }

.maint-menu {
  background: color-mix(in srgb, var(--m-bg) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--m-accent) 35%, transparent);
  box-shadow: 0 24px 60px -20px rgba(0, 0, 0, .8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.maint-accent { color: var(--m-accent); }
.maint-focus:focus-visible {
  outline: 2px solid var(--m-accent);
  outline-offset: 2px;
}

.break-keep { word-break: keep-all; overflow-wrap: anywhere; }

.maint-pop-enter-active, .maint-pop-leave-active { transition: opacity .15s ease, transform .15s ease; }
.maint-pop-enter-from, .maint-pop-leave-to { opacity: 0; transform: scale(.96) translateY(-4px); }

@media (prefers-reduced-motion: reduce) {
  .maint-cta { transition: none; }
  .maint-fade, .maint-pop-enter-active, .maint-pop-leave-active { transition: none; }
}
</style>
