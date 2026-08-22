<template>
  <Teleport to="body">
    <Transition name="modal">
      <!-- Same shell the account sections get when they are opened normally:
           the desktop rail panel (AppSidebar) on lg+, the profile modal's
           full-screen section sheet (NewProfileModal) below it. This modal is
           the guard's surface, so it has to be the SAME surface the member sees
           when they open 문의 themselves - it used to render its own oversized
           transparent header and read as a different feature. Both shells are
           driven off one set of nodes so InquiryContent is never mounted twice
           (it owns the expanded ticket and the write form). -->
      <div
        v-if="isOpen"
        class="tm-modal fixed inset-0 z-[100] flex flex-col overflow-hidden"
        :class="isDesktop
          ? 'items-center justify-center bg-black/90 px-4'
          : 'modal-body-fill'"
        :style="modalTheme"
        @click.self="handleCloseClick"
      >
        <div
          class="relative flex flex-col min-h-0"
          :class="isDesktop
            ? 'modal-body-fill modal-gradient-border w-[620px] max-w-full rounded-lg shadow-2xl overflow-hidden'
            : 'w-full flex-1'"
          :style="isDesktop ? panelStyle : undefined"
          role="dialog"
        >
          <!-- Header -->
          <div
            class="shrink-0 flex items-center justify-between"
            :class="isDesktop
              ? 'px-4 py-3 border-b tm-line'
              : 'relative z-10 px-4 py-2'"
          >
            <h2
              :class="isDesktop ? 'tm-accent-text text-lg font-medium' : 'text-white'"
              :style="isDesktop
                ? { fontFamily: 'var(--font-line-seed)' }
                : { fontFamily: 'var(--font-line-seed)', fontWeight: 600, marginTop: '17px', fontSize: '20px' }"
            >
              {{ title }}
            </h2>
            <button
              type="button"
              class="tm-muted hover:text-white transition-colors cursor-pointer"
              :class="isDesktop ? '' : 'self-start mt-1 pt-[14px]'"
              :aria-label="t('common.close')"
              @click="handleCloseClick"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                :width="isDesktop ? 20 : 26"
                :height="isDesktop ? 20 : 26"
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
          <div
            class="tm-scroll min-h-0 overflow-y-auto"
            :class="isDesktop
              ? 'p-4 flex-1'
              : 'tm-card flex-initial shrink min-w-0 max-h-full rounded-[18px] mx-2 p-4 mb-[20px]'"
          >
            <InquiryContent
              :inquiry-data="inquiryData"
              :on-refresh="handleRefresh"
              :on-page-change="handlePageChange"
              :current-page="currentPage"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useApi } from "@/composables/useApi";
import { getDateRangeLastNDays } from "~/lib/date";
import { validateResponse } from "@/lib/validateResponse";
import {
  inquiriesResponseWireSchema,
  mapInquiriesResponse,
  type InquiriesResponse,
} from "@/interfaces/inquiry.interface";

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
 * 1024, not the 768 default: the desktop rail (and with it the panel shell this
 * modal copies) appears at Tailwind's `lg`, so anything narrower gets the
 * profile modal's full-screen sheet instead.
 */
const { isMobile } = useMobileDetect(1024);
const isDesktop = computed(() => !isMobile.value);

/** Panel bounds copied from the rail panel, so the two cannot drift apart. */
const panelStyle = {
  maxWidth: "calc(100vw / var(--site-zoom, 1) - 32px)",
  maxHeight: "calc(100vh / var(--site-zoom, 1) - 120px)",
};

/**
 * The CMS menu label, which is what both default surfaces title the section
 * with — an operator who renames 문의 renames it here too.
 */
const title = computed(() => menu.labelForId("inquiry"));

const INQUIRY_DATE_RANGE = 30;
const INQUIRY_LIMIT = 10;

const inquiryData = ref<InquiriesResponse | null>(null);
const currentPage = ref(1);

const fetchInquiryData = async (page: number = 1) => {
  try {
    const { startDate, endDate } = getDateRangeLastNDays(INQUIRY_DATE_RANGE);
    const api = useApi();
    const raw = await api("/inquiries", {
      query: { page, limit: INQUIRY_LIMIT, startDate, endDate },
    });
    const data = mapInquiriesResponse(
      validateResponse(inquiriesResponseWireSchema, raw, "/inquiries"),
    );

    inquiryData.value = data;
    currentPage.value = page;

    // Update unread status
    const hasUnread = data.data.some(
      (inquiry) => inquiry.member_unread > 0,
    );
    uiStore.setHasUnreadInquiries(hasUnread);
  } catch (error) {
    console.error("Error fetching inquiries:", error);
  }
};

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
    if (open && !inquiryData.value) {
      await fetchInquiryData(1);
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
  inquiryData.value = null;
  currentPage.value = 1;
};

const handlePageChange = async (page: number) => {
  await fetchInquiryData(page);
};

const handleRefresh = async () => {
  await fetchInquiryData(currentPage.value);
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
