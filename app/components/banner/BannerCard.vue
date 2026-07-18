<template>
  <div class="relative w-full min-w-[300px] md:min-w-[340px] xl:min-w-[400px] max-w-[400px]" @click.stop>
    <!-- Card — gradient border + warm header/footer bands from theme.popupBanner.
         Border/glow reuse the shared `.modal-gradient-border` / `.tm-modal`
         classes (same source as the auth modals). -->
    <div class="tm-modal modal-gradient-border banner-card relative overflow-hidden rounded-[16px] flex flex-col h-auto"
      :style="cardStyle">
      <!-- Top band: centered logo -->
      <div class="relative z-10 flex items-center justify-center px-4 pt-[18px] pb-3.5">
        <NuxtImg :src="siteConfig.identity.logoPopup" :alt="siteConfig.identity.siteName"
          class="h-auto max-h-[22px] lg:max-h-[26px] w-auto drop-shadow" />
      </div>

      <!-- Banner image — fixed 380/500 portrait box, image object-cover (cropped
           to fit, no distortion, no letterbox). The card height (h-auto) follows
           this box, so the modal auto-sizes to the 380/500 image ratio. -->
      <div class="relative z-10 flex flex-col items-center justify-center px-1.5 pt-0">
        <div class="relative w-full mx-auto rounded-[6px] overflow-hidden" :style="imageBoxStyle">
          <NuxtImg :src="banner.image" :alt="banner.title || $t('common.banner')" :width="380" :height="500" fit="cover"
            class="block w-full h-full object-cover object-top" @error="onImageError" />
        </div>
      </div>

      <!-- Bottom band: centered block-pop-up pill + absolutely-positioned close.
           Generous top/bottom padding so the pill+close row sits in the orange
           band with a clear gap from the image above (matches reference). -->
      <div class="relative z-10 flex items-center justify-center px-3.5 pb-3 pt-3.5 mt-auto">
        <button type="button"
          class="[font-family:var(--font-line-seed)] w-[72%] cursor-pointer h-9 text-xs md:text-[12px] xl:text-[13px] transition-all duration-200 flex items-center justify-center shadow-lg"
          :style="blockButtonStyle" @click="$emit('close-today', banner.id)">
          {{ $t("notifications.blockPopup") }}
        </button>
        <button type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-white/10"
          :style="closeButtonStyle" :aria-label="$t('common.close')" @click="$emit('close-session', banner.id)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-7 h-7" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const siteConfig = useSiteConfig();

interface IBanner {
  id: number;
  title: string;
  image: string;
  sort: number;
  updated_at: string;
}

defineProps<{ banner: IBanner }>();
defineEmits<{
  "close-session": [id: number];
  "close-today": [id: number];
}>();

// Dedicated popup-banner theme (theme.popupBanner) — border, warm bands and the
// block-pop-up button. CSS vars feed the shared `.modal-gradient-border` rules
// and the scoped `.banner-card` bands below.
const pb = computed(() => siteConfig.theme.popupBanner);

const cardStyle = computed(() => ({
  "--body-bg": pb.value.modalBgColor,
  "--b-mid": pb.value.borderColor,
  "--b-accent": pb.value.accentColor,
  "--band-grad": pb.value.bandGradient,
}));

const blockButtonStyle = computed(() => ({
  borderRadius: "19px",
  border: `1px solid ${pb.value.blockButtonBorderColor}`,
  background: pb.value.blockButtonBgColor,
  color: pb.value.blockButtonTextColor,
  fontWeight: 500,
}));

const closeButtonStyle = computed(() => ({
  color: pb.value.accentColor,
}));

// Banner image frame — fixed 380/500 portrait aspect (image is object-cover, so
// it's cropped to fit without distortion or letterboxing). The card is h-auto,
// so the modal height follows this box on every screen size. Border in the modal
// border colour (theme.popupBanner.borderColor).
const imageBoxStyle = computed(() => ({
  aspectRatio: "380 / 500",
  border: `0.5px solid ${pb.value.borderColor}`,
}));

const onImageError = (e: Event | string) => {
  if (typeof e === "string") return;
  const target = e.target as HTMLImageElement;
  target.style.display = "none";
};
</script>

<style scoped>
/* Warm header + footer bands (orange fading into the near-black card fill),
   driven by the theme.popupBanner `--band-grad`. The footer band mirrors the
   header so the orange sits at the very bottom edge. Both sit behind the
   content (z-10) but above the card's own fill. */
.banner-card::before,
.banner-card::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 9%;
  background: var(--band-grad);
  pointer-events: none;
  z-index: 0;
}

.banner-card::before {
  top: 0;
  height: 7%;
}

.banner-card::after {
  bottom: 0;
  transform: scaleY(-1);
}
</style>
