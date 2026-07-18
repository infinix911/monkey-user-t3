<template>
  <Teleport to="body">
    <Transition name="modal">
    <div
v-if="ready && visibleBanners.length > 0"
      class="fixed inset-0 z-[10000] flex items-start justify-center p-4 bg-black/70 overflow-y-auto"
      @click.self="onBackdropClick">
      <!-- Mobile: centered, show only first banner -->
      <div v-if="isMobile" class="flex items-center justify-center w-full my-auto" @click.self="onBackdropClick">
        <BannerCard
v-if="visibleBanners[0]" :banner="visibleBanners[0]" @close-session="closeSession"
          @close-today="closeToday" />
      </div>

      <!-- Tablet / Desktop: flex row with queue -->
      <div
v-else class="flex items-center justify-center w-full mx-auto py-8 px-4 gap-2 my-auto"
        @click.self="onBackdropClick">
        <div v-for="banner in activeBanners" :key="banner.id">
          <BannerCard :banner="banner" @close-session="closeSession" @close-today="closeToday" />
        </div>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

interface IBanner {
  id: number;
  title: string;
  image: string;
  sort: number;
  updated_at: string;
}

// Banners are fetched server-side in the parent layout (app/layouts/default.vue)
// so /site/banners/popup never fires from the browser. This component is a
// pure consumer.
const props = defineProps<{ banners: IBanner[] }>();

const banners = computed<IBanner[]>(() => props.banners ?? []);
const closedIds = ref<string[]>([]);
// Initialize to a desktop-sized default so SSR and first client render match.
// Real viewport width is read in onMounted (and the popup is gated by `ready`).
const windowWidth = ref(1280);
// Stays false on SSR and during the initial client render. Flips true in
// onMounted AFTER localStorage has been read, so the first render that shows
// any card already reflects today's blocked list — no flash.
const ready = ref(false);

const isMobile = computed(() => windowWidth.value < 768);

const maxVisible = computed(() => {
  if (windowWidth.value >= 1669) return 4;
  return 3;
});

const visibleBanners = computed(() => {
  if (!ready.value) return [];
  return banners.value.filter((b) => !closedIds.value.includes(String(b.id)));
});

const activeBanners = computed(() =>
  visibleBanners.value.slice(0, maxVisible.value),
);

const onResize = () => {
  windowWidth.value = window.innerWidth;
};

const onBackdropClick = () => {
  const first = visibleBanners.value[0];
  if (!first) return;
  closedIds.value = [...closedIds.value, String(first.id)];
};

const closeSession = (id: number) => {
  closedIds.value = [...closedIds.value, String(id)];
};

const closeToday = (id: number) => {
  const today = new Date().toDateString();
  const newIds = [...closedIds.value, String(id)];
  localStorage.setItem(
    "closedBanners",
    JSON.stringify({ date: today, ids: newIds }),
  );
  closedIds.value = newIds;
};

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

onMounted(() => {
  window.addEventListener("resize", onResize, { passive: true });
  windowWidth.value = window.innerWidth;
  // Restore closed banners from localStorage
  const today = new Date().toDateString();
  const stored = localStorage.getItem("closedBanners");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        closedIds.value = parsed.ids || [];
      } else {
        localStorage.removeItem("closedBanners");
      }
    } catch {
      localStorage.removeItem("closedBanners");
    }
  }
  // Defer popup paint past the LCP measurement window. On slow links
  // (Jakarta WPT) this full-screen overlay was winning LCP over the hero
  // banner; delaying ~3s lets the preloaded hero claim LCP while users
  // still see the promo a moment later.
  const reveal = () => { ready.value = true };
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
  if (typeof ric === "function") {
    ric(reveal, { timeout: 3500 });
  } else {
    setTimeout(reveal, 3000);
  }
});
</script>
