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

const STORAGE_KEY = "closedBanners";
const BLOCK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Persisted as `{ [bannerId]: expiryTimestamp }`. Both dismiss paths write to
// the same map and differ only in how far out the expiry sits:
//   X / backdrop            → end of the current calendar day
//   "Block Popup (7 Days)"  → now + 7 days
type DismissMap = Record<string, number>;

const banners = computed<IBanner[]>(() => props.banners ?? []);
// Banner ids currently dismissed, with a live (unexpired) entry in storage.
const dismissedIds = ref<string[]>([]);
// Initialize to a desktop-sized default so SSR and first client render match.
// Real viewport width is read in onMounted (and the popup is gated by `ready`).
const windowWidth = ref(1280);
// Stays false on SSR and during the initial client render. Flips true
// synchronously in onMounted AFTER localStorage has been read, so the first
// painted frame after hydration already reflects the dismissed list — no flash,
// no delay.
const ready = ref(false);

const isMobile = computed(() => windowWidth.value < 768);

const maxVisible = computed(() => {
  if (windowWidth.value >= 1669) return 4;
  return 3;
});

const visibleBanners = computed(() => {
  if (!ready.value) return [];
  return banners.value.filter((b) => !dismissedIds.value.includes(String(b.id)));
});

const activeBanners = computed(() =>
  visibleBanners.value.slice(0, maxVisible.value),
);

const onResize = () => {
  windowWidth.value = window.innerWidth;
};

// Reads the stored map, discarding expired and malformed entries. Legacy shapes
// (`{ date, ids }` / `{ expires, ids }`) carry an `ids` array and are dropped
// wholesale, so upgrading users just see the popup once more.
const readDismissed = (): DismissMap => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    return {};
  }
  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || "ids" in parsed) return {};

    const now = Date.now();
    const live: DismissMap = {};
    for (const [id, expires] of Object.entries(parsed)) {
      if (typeof expires === "number" && now < expires) live[id] = expires;
    }
    return live;
  } catch {
    return {};
  }
};

// Hides the banner immediately and persists it until `expires`. An existing
// longer block always wins, so an X click can't shorten a 7-day block.
const dismiss = (id: number, expires: number) => {
  const key = String(id);
  const map = readDismissed();
  map[key] = Math.max(map[key] ?? 0, expires);
  dismissedIds.value = Object.keys(map);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable (private mode / quota) — the banner still closes for
    // this page view via the in-memory list.
  }
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

const onBackdropClick = () => {
  const first = visibleBanners.value[0];
  if (!first) return;
  dismiss(first.id, endOfToday());
};

// X button and backdrop — hidden for the rest of the calendar day.
const closeSession = (id: number) => dismiss(id, endOfToday());

// "Block Popup (7 Days)" — hidden for a full week. Clicking it again refreshes
// the window.
const closeToday = (id: number) => dismiss(id, Date.now() + BLOCK_DURATION_MS);

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

onMounted(() => {
  window.addEventListener("resize", onResize, { passive: true });
  windowWidth.value = window.innerWidth;
  // Restore dismissals, then flush the pruned map back so expired entries and
  // legacy payloads don't linger in storage.
  const map = readDismissed();
  dismissedIds.value = Object.keys(map);
  try {
    if (dismissedIds.value.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage unavailable — in-memory state is still correct */
  }
  // Reveal synchronously on the first client tick. Viewport width and the
  // dismissed list are already resolved above, so this render is final — no
  // hydration mismatch (nothing rendered on the server) and no layout shift
  // (the overlay is fixed-position).
  ready.value = true;
});
</script>
