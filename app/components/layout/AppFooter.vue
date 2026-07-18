<template>
  <footer ref="rootRef"
    class="relative isolate overflow-hidden border-t border-white/10 bg-gradient-to-b from-[#0b0b0e] via-[#08080a] to-[#050506] text-white"
    style="font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;">
    <!-- Animated aurora background -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
      <div class="aurora aurora-1" />
      <div class="aurora aurora-2" />
      <div class="aurora aurora-3" />
      <!-- Animated sheen on the top hairline -->
      <div class="absolute inset-x-0 top-0 h-px overflow-hidden">
        <div class="h-px w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div class="sheen absolute top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      </div>
    </div>

    <div class="relative mx-auto w-full max-w-[1200px] px-6 pt-16 pb-28 sm:px-8 lg:pt-20 lg:pb-16">
      <!-- ── CTA band (guests only) ─────────────────────────────────────── -->
      <div v-if="!isAuthenticated" :style="revealStyle(0)" :class="revealClass"
        class="relative mb-16 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-7 py-10 backdrop-blur-md sm:px-12 sm:py-12">
        <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
          style="background: radial-gradient(circle, rgba(0,180,216,0.22), transparent 70%);" />
        <div class="relative flex flex-col items-start gap-7 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
              <span class="bg-gradient-to-r from-white via-white to-cyan-200/80 bg-clip-text text-transparent">
                {{ $t('footer.cta.title') }}
              </span>
            </h2>
            <p class="mt-2.5 max-w-md text-sm text-white/45">{{ $t('footer.cta.subtitle') }}</p>
          </div>
          <button type="button"
            class="cta-btn group relative shrink-0 overflow-hidden rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:shadow-[0_10px_40px_-10px_rgba(0,180,216,0.7)] active:scale-95"
            @click="onJoin">
            <span class="relative z-10">{{ $t('footer.cta.button') }}</span>
            <span aria-hidden="true"
              class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
        </div>
      </div>

      <!-- ── Provider logos, grouped by category ────────────────────────── -->
      <section :style="revealStyle(1)" :class="revealClass">
        <div class="mt-1 space-y-10">
          <div v-for="(group, gi) in logoGroups" :key="group.key">
            <div class="flex items-center justify-center gap-4">
              <span class="h-px flex-1 max-w-[5rem] bg-gradient-to-r from-transparent to-white/15" />
              <span class="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">{{ group.title }}</span>
              <span class="h-px flex-1 max-w-[5rem] bg-gradient-to-l from-transparent to-white/15" />
            </div>

            <!-- Moving marquee — alternating direction per row, pauses on hover -->
            <!-- min-h reserves the logo-row height so the `revealed` gate
                 (empty -> populated) doesn't shift layout / cost CLS. -->
            <div class="marquee-wrap relative mt-6 overflow-hidden min-h-12 sm:min-h-14"
              style="-webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent); mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);">
              <ul class="footer-marquee flex w-max items-center gap-x-10 sm:gap-x-12"
                :class="{ 'footer-marquee--reverse': gi % 2 === 1 }"
                :style="{ animationDuration: group.logos.length * 4.5 + 's' }">
                <!-- Logos stay loading="eager" so every marquee row renders
                     (lazy broke the horizontally-animated rows — see 40fbd3c).
                     To keep those eager fetches (img + the shine mask-image)
                     off the initial critical path where they starve the LCP
                     banner, the whole row is gated on `revealed` — it only
                     mounts once the footer nears the viewport (IO below). -->
                <li v-for="(logo, i) in (revealed ? group.marquee : [])" :key="i"
                  class="group relative inline-flex shrink-0 items-center justify-center">
                  <img :src="logo" alt="" width="120" height="48" loading="eager" fetchpriority="low" decoding="async"
                    class="footer-logo invisible block h-12 w-[120px] object-contain object-center opacity-60 grayscale transition-[transform,opacity,filter] duration-500 ease-out group-hover:scale-110 group-hover:opacity-100 group-hover:grayscale-0 sm:h-14 sm:w-[140px]"
                    @load="onLogoLoad">
                  <!-- Continuous shine sweep, masked to the logo's silhouette -->
                  <span class="logo-shine pointer-events-none absolute inset-0" :style="shineStyle(logo, i)"
                    aria-hidden="true" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Divider -->
      <div class="mt-16 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <!-- ── Brand + quick links ────────────────────────────────────────── -->
      <div :style="revealStyle(2)" :class="revealClass" class="mt-14 grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-10">
        <!-- Brand block -->
        <div class="text-center lg:text-left lg:col-span-5">
          <NuxtLink :to="localePath('/')" class="inline-flex items-center" :aria-label="siteConfig.identity.siteName">
            <img :src="siteConfig.identity.logo" :alt="siteConfig.identity.siteName" class="h-9 w-auto object-contain"
              loading="lazy" decoding="async">
          </NuxtLink>

          <p class="mt-6 max-w-sm mx-auto lg:mx-0 text-[15px] leading-relaxed text-white/45">
            {{ $t('footer.tagline') }}
          </p>

          <!-- Social -->
          <div class="mt-9 flex items-center justify-center lg:justify-start gap-3">
            <a v-for="s in socials" :key="s.name" :href="s.href" target="_blank" rel="noopener noreferrer"
              :aria-label="s.name"
              class="group flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white/55 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_8px_24px_-10px_rgba(0,180,216,0.6)]">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span class="block h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110"
                v-html="s.icon" />
            </a>
          </div>
        </div>

        <!-- Quick Links / Games columns -->
        <nav class="grid grid-cols-2 gap-8 sm:gap-12 lg:col-span-7 lg:pl-8"
          :aria-label="$t('footer.columns.quickLinks')">
          <div v-for="col in columns" :key="col.heading" class="text-center lg:text-left">
            <h3 class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{{ col.heading }}</h3>
            <ul class="mt-6 space-y-4">
              <li v-for="link in col.links" :key="link.label">
                <component :is="link.action ? 'button' : (link.to && link.to.startsWith('/') ? NuxtLink : 'a')"
                  v-bind="link.action ? { type: 'button' } : (link.to && link.to.startsWith('/') ? { to: localePath(link.to) } : { href: link.to })"
                  class="group relative inline-flex w-fit items-center text-sm text-white/55 transition-all duration-200 hover:translate-x-0.5 hover:text-white cursor-pointer"
                  @click="onLink(link)">
                  {{ link.label }}
                  <span
                    class="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-cyan-300/80 to-white/10 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </component>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <!-- Divider -->
      <div class="mt-16 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <!-- Bottom bar -->
      <div :style="revealStyle(3)" :class="revealClass"
        class="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p class="text-xs text-white/35">© {{ siteConfig.identity.siteName }}. {{ $t('footer.rights') }}</p>
        <p class="text-[11px] uppercase tracking-[0.15em] text-white/30">{{ $t('footer.disclaimer') }}</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, resolveComponent } from "vue";
import { useI18n } from "vue-i18n";
import { CASINO_LOGOS, SLOT_LOGOS, SPORT_LOGOS } from "./footerLogos";

const { t } = useI18n();
const siteConfig = useSiteConfig();
const { config: apiConfig } = useSiteConfigState();
const contactHandles = computed(
  () => apiConfig.value?.contact?.handles || siteConfig.contact.handles,
);
const localePath = useLocalePath();
const authStore = useAuthStore();
const uiStore = useUiStore();

// NuxtLink for internal routes; external/placeholder links fall back to <a>.
const NuxtLink = resolveComponent("NuxtLink");

const isAuthenticated = computed(() => authStore.isAuthenticated);

const onJoin = () => uiStore.setShowSignupModal(true);

// Footer quick-link modal actions — all public (Promotions/FAQ/Contact). The
// footer doesn't expose the auth-gated Deposit/Withdraw/Inquiry links, so no
// login-fallback wrapper is needed here.
const openPromotion = () => uiStore.setShowPromotionModal(true);
const openFaq = () => uiStore.setShowFaqModal(true);
const openContact = () => uiStore.setShowContactModal(true);

// Runs a link's modal action (if any). NuxtLink/`<a>` links have no action,
// so this is a no-op for them and normal navigation proceeds.
type FooterLink = { label: string; to?: string; action?: () => void };
const onLink = (link: FooterLink) => link.action?.();

// Scroll-reveal: blocks fade/slide up in a stagger the first time the footer
// enters the viewport. SSR renders fully visible; we only opt into the hidden
// initial state on the client when motion is allowed (no flash since the footer
// is below the fold). Honours prefers-reduced-motion.
const rootRef = ref<HTMLElement | null>(null);
const animate = ref(false);
const revealed = ref(false);
let io: IntersectionObserver | null = null;

const revealClass = computed(() =>
  animate.value && !revealed.value
    ? "translate-y-6 opacity-0 transition-all duration-700 ease-out"
    : "translate-y-0 opacity-100 transition-all duration-700 ease-out",
);
const revealStyle = (i: number) => ({
  transitionDelay: animate.value && revealed.value ? `${i * 110}ms` : "0ms",
});

onMounted(() => {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window) || !rootRef.value) {
    revealed.value = true;
    return;
  }
  animate.value = true;
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        revealed.value = true;
        io?.disconnect();
      }
    },
    // Fire well before the footer reaches the viewport so the logos mount,
    // load and finish their reveal ahead of the user scrolling to them —
    // otherwise the content visibly pops/loads in late.
    { rootMargin: "800px 0px", threshold: 0 },
  );
  io.observe(rootRef.value);
});

onBeforeUnmount(() => io?.disconnect());

// Some provider logos are portrait 480×627 export canvases where the actual
// wordmark sits in the bottom band, ringed by ~70% transparent padding (mostly
// above it). object-contain would render that tiny glyph far smaller than the
// tightly-cropped landscape logos. So for any image taller than it is wide we
// switch to object-cover anchored low (50% 88%) — the box shows just the
// bottom band where the logo lives, scaled up to match the cropped ones. No
// source asset is altered; this is purely a render-time fit/position swap.
const onLogoLoad = (e: Event) => {
  const img = e.target as HTMLImageElement;
  // Decide the fit BEFORE the logo is ever visible, so it paints at its final
  // size on the first frame — no small→big flash. Portrait padded canvases get
  // object-cover anchored low; tight landscape logos stay object-contain.
  if (img.naturalHeight > img.naturalWidth) {
    img.classList.remove("object-contain", "object-center");
    img.classList.add("object-cover");
    img.style.objectPosition = "50% 88%";
  }
  img.classList.remove("invisible");
};

// Clips the shine sweep to each logo's own silhouette (alpha mask) and
// staggers the start so the sheen flows across the row as a continuous wave.
const shineStyle = (logo: string, i: number) => ({
  WebkitMaskImage: `url(${logo})`,
  maskImage: `url(${logo})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  animationDelay: `${(i % 10) * 0.55}s`,
});

// Provider logos grouped by category. `marquee` duplicates each set so the
// track loops seamlessly (the CSS animation shifts by exactly one set / -50%).
const logoGroups = computed(() =>
  [
    { key: "casino", title: t("footer.links.casino"), logos: CASINO_LOGOS },
    { key: "slots", title: t("footer.links.slots"), logos: SLOT_LOGOS },
    { key: "sports", title: t("footer.links.sports"), logos: SPORT_LOGOS },
  ].map((g) => ({ ...g, marquee: [...g.logos, ...g.logos] })),
);

// Footer navigation. Internal paths (starting with "/") render as locale-aware
// NuxtLinks; "#" placeholders render as <a>.
const columns = computed(() => [
  {
    heading: t("footer.columns.quickLinks"),
    links: [
      { label: t("footer.links.promotions"), action: openPromotion },
      { label: t("footer.links.faq"), action: openFaq },
      { label: t("footer.links.contact"), action: openContact },
    ] as FooterLink[],
  },
  {
    heading: t("footer.columns.games"),
    links: [
      { label: t("footer.links.casino"), to: "/casino" },
      { label: t("footer.links.slots"), to: "/slots" },
      { label: t("footer.links.sports"), to: "/sports" },
      { label: t("footer.links.fishing"), to: "/fishing" },
      { label: t("footer.links.virtual"), to: "/virtual" },
    ] as FooterLink[],
  },
]);

const WHATSAPP_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
const TELEGRAM_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full"><path d="M21.5 4.5 2.5 11.8l5.6 1.9 1.9 5.6 2.7-3.6 4.3 3.2 4.5-14.4Z"/><path d="m8.1 13.7 9.4-7"/></svg>`;
const LINE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full"><path d="M21 10.5c0-4.142-4.03-7.5-9-7.5S3 6.358 3 10.5c0 3.71 3.196 6.82 7.5 7.407.293.063.69.193.79.443.092.228.06.584.03.817l-.127.795c-.04.24-.18.938.803.512 1-.428 5.406-3.257 7.378-5.574C20.46 13.586 21 12.1 21 10.5z"/></svg>`;
const MESSENGER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.836 1.343 5.37 3.457 7.063V21l3.184-1.75A11.12 11.12 0 0 0 12 19.486c5.523 0 10-4.145 10-9.243S17.523 2 12 2z"/><path d="m8 13 2.5-3.5L13 11.5l2.5-3.5" stroke-linecap="round"/></svg>`;

const socials = computed(() => {
  const h = contactHandles.value;
  const items: { name: string; href: string; icon: string }[] = [];
  if (h.whatsapp) {
    const phone = h.whatsapp.replace(/[+\s]/g, "");
    items.push({ name: "WhatsApp", href: `https://wa.me/${phone}`, icon: WHATSAPP_SVG });
  }
  if (h.telegram) {
    items.push({ name: "Telegram", href: `https://t.me/${h.telegram.replace("@", "")}`, icon: TELEGRAM_SVG });
  }
  if (h.line) {
    const u = h.line.startsWith("@") ? h.line : `@${h.line}`;
    items.push({ name: "LINE", href: `https://line.me/R/ti/p/${u}`, icon: LINE_SVG });
  }
  if (h.messenger) {
    items.push({ name: "Messenger", href: `https://m.me/${h.messenger.replace("@", "")}`, icon: MESSENGER_SVG });
  }
  return items;
});
</script>

<style scoped>
/* Drifting aurora blobs — slow, GPU-friendly transform/opacity loops. */
.aurora {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  opacity: 0.5;
  will-change: transform;
}

.aurora-1 {
  top: -10rem;
  left: 10%;
  width: 32rem;
  height: 32rem;
  background: radial-gradient(circle, rgba(0, 180, 216, 0.22), transparent 65%);
  animation: aurora-a 18s ease-in-out infinite;
}

.aurora-2 {
  top: -6rem;
  right: 6%;
  width: 26rem;
  height: 26rem;
  background: radial-gradient(circle, rgba(113, 30, 219, 0.18), transparent 65%);
  animation: aurora-b 22s ease-in-out infinite;
}

.aurora-3 {
  bottom: -14rem;
  left: 40%;
  width: 30rem;
  height: 30rem;
  background: radial-gradient(circle, rgba(40, 94, 255, 0.14), transparent 65%);
  animation: aurora-a 26s ease-in-out infinite reverse;
}

@keyframes aurora-a {

  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(6%, 4%, 0) scale(1.12);
  }
}

@keyframes aurora-b {

  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1.05);
  }

  50% {
    transform: translate3d(-7%, 5%, 0) scale(0.95);
  }
}

/* Moving logo marquee. The track holds two copies of the set, so a -50% shift
   lands exactly on the seam for a seamless loop. Pauses on hover; reverse
   variant scrolls the opposite way. Duration is set inline per row. */
.footer-marquee {
  animation: footer-marquee 60s linear infinite;
  will-change: transform;
}

.footer-marquee--reverse {
  animation-direction: reverse;
}

.marquee-wrap:hover .footer-marquee {
  animation-play-state: paused;
}

@keyframes footer-marquee {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}

/* Continuous per-logo shine sweep (clipped to the logo silhouette via mask).
   The sweep happens early in the cycle, then idles — combined with the
   per-logo stagger this reads as a slow light wave flowing across the row. */
.logo-shine {
  background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.85) 50%, transparent 62%);
  background-size: 250% 100%;
  background-position: 150% 0;
  opacity: 0;
  animation: logo-shine 6s ease-in-out infinite;
}

.marquee-wrap:hover .logo-shine {
  animation-play-state: paused;
}

@keyframes logo-shine {
  0% {
    background-position: 150% 0;
    opacity: 0;
  }

  6% {
    opacity: 1;
  }

  20% {
    background-position: -60% 0;
    opacity: 0;
  }

  100% {
    background-position: -60% 0;
    opacity: 0;
  }
}

/* Sheen sweeping across the top hairline. */
.sheen {
  animation: sheen-sweep 7s linear infinite;
}

@keyframes sheen-sweep {
  0% {
    transform: translateX(-120%);
  }

  60%,
  100% {
    transform: translateX(420%);
  }
}

@media (prefers-reduced-motion: reduce) {

  .aurora,
  .sheen,
  .footer-marquee,
  .logo-shine {
    animation: none;
  }
}
</style>
