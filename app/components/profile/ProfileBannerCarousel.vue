<template>
  <div
    :class="[
      'w-full lg:w-[370px] relative max-w-full rounded-sm overflow-hidden',
      className,
    ]"
  >
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="relative w-full max-w-full rounded-[2px] overflow-hidden bg-[#1a1a1a] h-[100px] xl:h-[120px] flex items-center justify-center my-3"
    >
      <span class="text-white/50 text-sm">{{ t("common.loading") }}</span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="banners.length === 0"
      class="relative w-full max-w-full rounded-[2px] overflow-hidden bg-[#1a1a1a] h-[135px] xl:h-[163px] flex items-center justify-center"
    >
      <span class="text-white/50 text-sm">{{ $t('common.noBanners') }}</span>
    </div>

    <!-- Carousel -->
    <template v-else>
      <div
        ref="carouselRef" class="overflow-hidden w-full max-w-full touch-pan-y"
        @pointerdown="onPointerDown" @pointermove="onPointerMove"
        @pointerup="onPointerUp" @pointercancel="onPointerCancel"
      >
        <div
          class="flex max-w-full ease-in-out"
          :class="{ 'transition-transform duration-300': !isDragging }"
          :style="{ transform: trackTransform }"
        >
          <div
            v-for="banner in banners"
            :key="banner.id"
            class="shrink-0 w-full max-w-full relative overflow-hidden"
          >
            <NuxtImg
              :src="banner.image"
              :alt="banner.title || `Banner ${banner.id}`"
              class="block w-full h-auto object-contain rounded-[2px]"/>
          </div>
        </div>
      </div>

      <!-- Navigation Dots -->
      <div
        v-if="banners.length > 1"
        class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10"
      >
        <button
          v-for="(_, index) in banners"
          :key="index"
          :class="[
            'transition-all duration-300 rounded-sm',
            index === selectedIndex
              ? 'bg-white w-6 h-2'
              : 'bg-white/50 w-6 h-2 hover:bg-white/70',
          ]"
          :aria-label="`Go to slide ${index + 1}`"
          @click="scrollTo(index)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useApi } from "@/composables/useApi";
import { useCarouselSwipe } from "@/composables/useCarouselSwipe";

interface IPromotionBoard {
  id: string;
  order: number;
  thumbnail: string;
  description: string;
}

interface Banner {
  id: string;
  title?: string;
  image: string;
  sort: number;
}

const props = defineProps<{
  banners?: Banner[];
  className?: string;
}>();

const { t } = useI18n();

const banners = ref<Banner[]>(props.banners || []);
const selectedIndex = ref(0);
const isLoading = ref(!props.banners);
let autoPlayInterval: ReturnType<typeof setInterval> | null = null;

function scrollTo(index: number) {
  selectedIndex.value = index;
}

// Pointer swipe (mouse + touch) via the shared composable. The dots and the
// transform are both driven by `selectedIndex`, so they stay in sync. Autoplay
// pauses for the duration of the drag.
const { isDragging, trackTransform, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
  useCarouselSwipe({
    count: () => banners.value.length,
    index: selectedIndex,
    onInteractStart: stopAutoPlay,
    onInteractEnd: startAutoPlay,
  });

function startAutoPlay() {
  if (banners.value.length > 1) {
    autoPlayInterval = setInterval(() => {
      selectedIndex.value = (selectedIndex.value + 1) % banners.value.length;
    }, 5000);
  }
}

function stopAutoPlay() {
  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
  }
}

onMounted(async () => {
  if (!props.banners) {
    try {
      isLoading.value = true;
      const api = useApi();
      const boards =
        (await api<IPromotionBoard[]>("/promotions/boards")) || [];

      banners.value = boards
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((board) => ({
          id: board.id,
          title: board.description,
          image: board.thumbnail,
          sort: board.order,
        }));
    } catch (err) {
      console.error("Failed to fetch profile banners:", err);
      banners.value = [];
    } finally {
      isLoading.value = false;
    }
  }
  startAutoPlay();
});

onUnmounted(() => {
  stopAutoPlay();
});
</script>
