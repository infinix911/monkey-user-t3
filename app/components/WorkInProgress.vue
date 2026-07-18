<template>
  <div class="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12 w-full xl:w-[1152px] mx-auto">
    <div
:class="[
      'max-w-2xl w-full transition-all duration-1000',
      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
    ]">
      <!-- Main Container with Brand Color Border Glow -->
      <div class="relative">
        <!-- Animated Glow Border -->
        <div
class="absolute inset-0 rounded-3xl opacity-50 blur-xl animate-pulse" :style="{
          background: `linear-gradient(to right, ${brandColor}, ${brandColorLight}, ${brandColor})`,
        }" />

        <!-- Content Container -->
        <div
class="relative bg-gradient-to-b from-gray-900 to-black border-2 rounded-3xl p-8 md:p-12 shadow-2xl"
          :style="{ borderColor: brandColor }">
          <!-- Floating Particles -->
          <div class="absolute top-0 left-0 w-full h-full overflow-hidden rounded-3xl pointer-events-none">
            <div
class="absolute top-[10%] left-[10%] w-2 h-2 rounded-full animate-ping"
              :style="{ backgroundColor: brandColor }" />
            <div
class="absolute top-[60%] left-[80%] w-1.5 h-1.5 rounded-full animate-ping"
              :style="{ backgroundColor: brandColor, animationDelay: '0.5s' }" />
            <div
class="absolute top-[30%] left-[70%] w-2 h-2 rounded-full animate-ping" :style="{
              backgroundColor: brandColorLight,
              animationDelay: '1s',
            }" />
            <div
class="absolute top-[80%] left-[20%] w-1 h-1 rounded-full animate-ping"
              :style="{ backgroundColor: brandColor, animationDelay: '1.5s' }" />
          </div>

          <!-- Icon with Animation -->
          <div class="flex justify-center mb-8">
            <div class="relative">
              <!-- Rotating Ring -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div
class="w-24 h-24 md:w-32 md:h-32 border-4 border-transparent rounded-full animate-spin"
                  :style="{ borderTopColor: brandColor }" />
              </div>
              <!-- Central Icon -->
              <div class="relative text-6xl md:text-8xl animate-bounce">
                <span class="inline-block" :style="{ filter: `drop-shadow(0 0 20px ${brandColor}80)` }">
                  &#128679;
                </span>
              </div>
            </div>
          </div>

          <!-- Heading with Brand Shimmer -->
          <h2
class="text-4xl md:text-6xl font-bold text-center mb-6 wip-shimmer"
            style="font-family: var(--font-line-seed), sans-serif" :style="{
              '--brand-color': brandColor,
              '--brand-color-light': brandColorLight,
            }">
            WORK IN PROGRESS
          </h2>

          <!-- Subtitle -->
          <p
class="text-lg md:text-xl text-center text-gray-300 mb-8"
            style="font-family: var(--font-line-seed), sans-serif">
            We're crafting something amazing for you!
          </p>

          <!-- Decorative Divider -->
          <div class="flex items-center justify-center gap-4 mb-8">
            <div
class="h-px w-16" :style="{
              background: `linear-gradient(to right, transparent, ${brandColor})`,
            }" />
            <div class="flex gap-2">
              <span class="text-2xl animate-pulse">&#11088;</span>
              <span class="text-2xl animate-pulse" style="animation-delay: 0.3s">&#10024;</span>
              <span class="text-2xl animate-pulse" style="animation-delay: 0.6s">&#11088;</span>
            </div>
            <div
class="h-px w-16" :style="{
              background: `linear-gradient(to left, transparent, ${brandColor})`,
            }" />
          </div>

          <!-- Description -->
          <p class="text-center text-gray-400 mb-8" style="font-family: var(--font-line-seed), sans-serif">
            Our team is working hard to bring you an incredible gaming
            experience.
            <br >
            Stay tuned for updates!
          </p>

          <!-- Loading Bar -->
          <div class="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
class="absolute h-full rounded-full w-full wip-loading" :style="{
              background: `linear-gradient(to right, ${brandColor}, ${brandColorLight}, ${brandColor})`,
            }" />
          </div>

          <!-- Bottom Icons -->
          <div class="flex justify-center gap-4 mt-8 text-3xl">
            <span class="animate-bounce">&#127918;</span>
            <span class="animate-bounce" style="animation-delay: 0.2s">&#127920;</span>
            <span class="animate-bounce" style="animation-delay: 0.4s">&#127139;</span>
            <span class="animate-bounce" style="animation-delay: 0.6s">&#127922;</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";

const siteConfig = useSiteConfig();
const mounted = ref(false);

const brandColor = computed(() => siteConfig.theme.brandColor);
const brandColorLight = computed(() => {
  // Create a lighter variant by adjusting the hex color
  const hex = siteConfig.theme.brandColor.replace("#", "");
  const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + 40);
  const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + 40);
  const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + 40);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
});

onMounted(() => {
  mounted.value = true;
});
</script>

<style scoped>
.wip-shimmer {
  font-weight: 700;
  background: linear-gradient(135deg,
      var(--brand-color) 0%,
      var(--brand-color-light) 25%,
      var(--brand-color) 50%,
      var(--brand-color-light) 75%,
      var(--brand-color) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s linear infinite;
}

.wip-loading {
  animation: loading 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% center;
  }

  100% {
    background-position: 200% center;
  }
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }

  50% {
    transform: translateX(0%);
  }

  100% {
    transform: translateX(100%);
  }
}
</style>
