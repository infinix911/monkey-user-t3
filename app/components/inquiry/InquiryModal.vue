<template>
  <Teleport to="body">
    <Transition name="modal">
      <!-- The rail panel's shell (AppSidebar), at EVERY width - a bordered card
           on a dimmed backdrop, not a full-screen sheet. It briefly mirrored
           the profile modal's mobile sheet below `lg`, which made the same
           feature look like two different ones depending on the device.

           Opens 10% down the viewport rather than centred: the list grows
           downward as tickets expand, so a centred panel shifts under the
           reader on every tap. Same reasoning as `.tm-dialog-shell` (main.css)
           for deposit/withdraw, which also ride high rather than centre. -->
      <div
        v-if="isOpen"
        class="tm-modal fixed inset-0 z-[100] flex items-start justify-center overflow-hidden bg-black/90 px-4 pt-[10dvh] pb-6"
        :style="modalTheme"
        @click.self="handleCloseClick"
      >
        <div
          class="modal-body-fill modal-gradient-border relative flex min-h-0 w-[620px] max-w-full flex-col overflow-hidden rounded-lg shadow-2xl"
          :style="panelStyle"
          role="dialog"
        >
          <!-- Header -->
          <div class="shrink-0 flex items-center justify-between px-4 py-3 border-b tm-line">
            <h2
              class="tm-accent-text text-lg font-medium"
              style="font-family: var(--font-line-seed)"
            >
              {{ title }}
            </h2>
            <button
              type="button"
              class="tm-muted hover:text-white transition-colors cursor-pointer"
              :aria-label="t('common.close')"
              @click="handleCloseClick"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 27 27"
                fill="none"
              >
                <line
                  x1="1.41421" y1="1" x2="25.627" y2="25.2127"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round"
                />
                <line
                  x1="1" y1="-1" x2="35.242" y2="-1"
                  transform="matrix(-0.707107 0.707107 0.707107 0.707107 26.6732 1)"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="tm-scroll min-h-0 flex-1 overflow-y-auto p-4">
            <InquiryContent
              :inquiry-data="inquiry.data.value"
              :on-refresh="handleRefresh"
              :on-page-change="handlePageChange"
              :current-page="inquiry.page.value"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useInquiryFeed } from "@/composables/useInquiryFeed";

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const uiStore = useUiStore();
const menu = useProfileMenuItems();

/** Deposit/withdraw palette, inherited by InquiryContent and its cards. */
const modalTheme = useModalTheme();

/**
 * Panel bounds. Width follows the rail panel; the height allows for the 10%
 * the overlay's `pt-[10dvh]` leaves above and the 24px below, so the panel can
 * grow into what is left of the viewport instead of running past it.
 *
 * `dvh`, not `vh`: with a mobile browser's collapsing address bar `vh` is the
 * tallest the viewport ever gets, so a panel sized off it hangs past the
 * visible area on first paint (same reason `.tm-dialog-shell` uses dvh).
 */
const panelStyle = {
  maxWidth: "calc(100vw / var(--site-zoom, 1) - 32px)",
  maxHeight: "calc(90dvh / var(--site-zoom, 1) - 24px)",
};

/**
 * The CMS menu label, which is what both default surfaces title the section
 * with — an operator who renames 문의 renames it here too.
 */
const title = computed(() => menu.labelForId("inquiry"));

const inquiry = useInquiryFeed();

// Fetch data when the modal opens.
//
// `immediate` is required, not a nicety: the layout renders this component
// behind `v-if="uiStore.showInquiryModal"`, so it is CREATED with `isOpen`
// already true and a lazy watcher never fires — the modal mounts empty and
// stays empty. That is what the unread guard hit: it flips the flag, the
// component mounts open, and nothing fetched.
watch(
  () => props.isOpen,
  async (open) => {
    if (open && !inquiry.data.value) {
      await inquiry.load(1);
    }
  },
  { immediate: true },
);

const handleCloseClick = async () => {
  if (uiStore.hasUnreadInquiries) {
    await showUnreadInquiryAlert();
    return;
  }
  emit("close");
  inquiry.reset();
};

const handlePageChange = async (page: number) => {
  await inquiry.load(page);
};

const handleRefresh = async () => {
  await inquiry.refresh();
};
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
