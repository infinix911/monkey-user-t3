<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Action Buttons - Fixed Section -->
    <div class="flex-shrink-0 px-0 py-6">
      <div class="flex gap-2 md:gap-3">
        <template v-if="!showForm">
          <!-- 전체 읽기 — clears every unread flag in one call, which is also
               what releases the close guard (uiStore.hasUnreadInquiries blocks
               dismissing this modal while anything is unread). Disabled when
               there is nothing unread, so it never looks like a no-op action.
               Highlighted while unread exist: it is the way out of the guard. -->
          <button
            :disabled="!hasUnread"
            :class="[
              'font-medium rounded-lg w-full flex items-center justify-center gap-1.5 px-4 py-2.5 transition-colors text-sm md:text-base',
              hasUnread
                ? 'tm-btn-ghost !text-[#FF7575] !border-[#FF7575]/60 hover:!bg-[#FF7575]/10 cursor-pointer'
                : 'tm-btn-ghost opacity-40 cursor-not-allowed',
            ]"
            @click="handleReadAll"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m1.5 12.5 4 4 8-8" />
              <path d="m10.5 12.5 4 4 8-8" />
            </svg>
            <span>{{ t("inquiry.readAll") }}</span>
          </button>
          <!-- Destructive action: an outline button, so the yellow "write"
               button next to it stays the one primary call to action. -->
          <button
            class="tm-btn-ghost font-medium rounded-lg w-full flex items-center justify-center gap-1.5 px-4 py-2.5 hover:!text-[#FF7575] hover:!border-[#FF7575]/60 hover:!bg-[#FF7575]/10 transition-colors text-sm md:text-base cursor-pointer"
            @click="handleDeleteAll"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 18 24"
              fill="currentColor"
            >
              <path
                d="M1.28571 21.3333C1.28571 22.8 2.44286 24 3.85714 24H14.1429C15.5571 24 16.7143 22.8 16.7143 21.3333V5.33333H1.28571V21.3333ZM3.85714 8H14.1429V21.3333H3.85714V8ZM13.5 1.33333L12.2143 0H5.78571L4.5 1.33333H0V4H18V1.33333H13.5Z"
              />
            </svg>
            <span>{{ t("inquiry.deleteAll") }}</span>
          </button>
          <button
            class="tm-btn font-medium w-full flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg transition-opacity font-semibold text-sm md:text-base shadow-sm cursor-pointer"
            @click="handleWriteInquiry"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M0 15.8339V20H4.16609L16.4533 7.71282L12.2872 3.54673L0 15.8339ZM19.675 4.49104C20.1083 4.05777 20.1083 3.35787 19.675 2.92459L17.0754 0.324955C16.6421 -0.108318 15.9422 -0.108318 15.509 0.324955L13.4759 2.35801L17.642 6.52409L19.675 4.49104Z"
                fill="currentColor"
              />
            </svg>
            <span>{{ t("inquiry.writeInquiry") }}</span>
          </button>
        </template>
        <template v-else>
          <button
            class="tm-btn-ghost w-full flex items-center justify-center gap-2 px-4 py-2.5 md:px-5 md:py-3 rounded-lg transition-all duration-200 font-medium text-sm md:text-base cursor-pointer"
            @click="handleBack"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 md:w-5 md:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>{{ t("common.back") }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="tm-scroll flex-1 overflow-y-auto px-0 pb-4 font-medium">
      <!-- Write Inquiry Form -->
      <WriteInquiry
        v-if="showForm"
        :is-submitting="isSubmitting"
        @submit="handleSubmitInquiry"
        @cancel="handleBack"
      />

      <!-- Inquiry Content -->
      <template v-else>
        <!-- Unread notice. The modal cannot be closed while anything is unread
             (uiStore.hasUnreadInquiries — see InquiryModal.handleCloseClick and
             useProfileMenu.closeMobileModal), so say that up front rather than
             letting the member discover it by pressing X and getting an error. -->
        <div
          v-if="hasUnread"
          class="mb-3 flex items-center gap-2 rounded-lg border border-[#FF7575]/40 bg-[#FF7575]/10 px-3 py-2.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 shrink-0 text-[#FF7575]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
          <span class="text-[12px] md:text-[13px] leading-snug text-white/85">
            {{ t("inquiry.mustReadMessages") }}
          </span>
        </div>

        <!-- All Inquiries -->
        <div
          v-if="inquiryData?.data && inquiryData.data.length > 0"
          class="flex flex-col gap-2 md:gap-3"
        >
          <InquiryCard
            v-for="inquiry in inquiryData.data"
            :key="inquiry.id"
            :inquiry="inquiry"
            :is-expanded="expandedId === inquiry.id"
            :replies="replies[inquiry.id]"
            :is-loading-replies="loadingReplies[inquiry.id] || false"
            :is-closing="closingInquiries[inquiry.id] || false"
            @toggle="handleToggle"
            @delete="handleDelete"
            @close="handleCloseInquiry"
            @send-reply="handleSendReply"
          />
        </div>

        <!-- No Inquiries Message -->
        <div
          v-if="!hasInquiries"
          class="text-center py-12 flex flex-col items-center gap-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="tm-muted w-16 h-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
            />
          </svg>
          <p class="tm-muted text-base md:text-lg">
            {{ t("inquiry.noInquiries") }}
          </p>
        </div>

        <!-- Pagination -->
        <div
          v-if="hasInquiries && totalPages > 1"
          class="mt-4 flex justify-center"
        >
          <div class="flex items-center gap-2">
            <!-- Previous Button -->
            <button
              :disabled="currentPage === 1 || isLoadingPage"
              class="tm-btn-ghost flex items-center gap-1 transition-colors px-2 py-1 rounded cursor-pointer"
              @click="handlePageChange(currentPage - 1)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span class="text-sm hidden sm:inline">{{
                t("common.previous")
              }}</span>
            </button>

            <!-- Page Numbers -->
            <div class="flex items-center gap-1">
              <template v-for="(page, index) in getPageNumbers()" :key="index">
                <span v-if="page === '...'" class="tm-muted px-2 text-sm"
                  >...</span
                >
                <button
                  v-else
                  :disabled="isLoadingPage"
                  :class="[
                    'min-w-[32px] h-8 px-3 text-sm font-medium transition-all duration-200 rounded cursor-pointer',
                    page === currentPage ? 'tm-btn font-bold' : 'tm-btn-ghost',
                  ]"
                  @click="handlePageChange(page as number)"
                >
                  {{ page }}
                </button>
              </template>
            </div>

            <!-- Next Button -->
            <button
              :disabled="currentPage === totalPages || isLoadingPage"
              class="tm-btn-ghost flex items-center gap-1 transition-colors px-2 py-1 rounded cursor-pointer"
              @click="handlePageChange(currentPage + 1)"
            >
              <span class="text-sm hidden sm:inline">{{
                t("common.next")
              }}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type {
  InquiryItem,
  RepliesResponse,
} from "~/interfaces/inquiry.interface";
import { showConfirmationAlert } from "~~/utils/swal-alert";

export interface InquiryResponse {
  pages: number;
  rows: number;
  data: InquiryItem[];
}

interface Props {
  inquiryData: InquiryResponse | null;
  onRefresh?: () => Promise<void>;
  onPageChange?: (page: number) => Promise<void>;
  currentPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  onRefresh: undefined,
  onPageChange: undefined,
  currentPage: 1,
});

const { t } = useI18n();
const mutations = useInquiryMutations(props.onRefresh);

// State
const expandedId = ref<string | null>(null);
const replies = ref<Record<string, RepliesResponse>>({});
const loadingReplies = ref<Record<string, boolean>>({});
const showForm = ref(false);
const currentPage = ref(props.currentPage || 1);
const isLoadingPage = ref(false);
const isSubmitting = ref(false);
const closingInquiries = ref<Record<string, boolean>>({});

// Sync currentPage with prop
watch(
  () => props.currentPage,
  (newPage) => {
    if (newPage !== undefined && newPage !== currentPage.value) {
      currentPage.value = newPage;
    }
  },
);

// Utilities
const hasInquiries = computed(() => (props.inquiryData?.data?.length ?? 0) > 0);

/**
 * Whether any inquiry on this page still has replies the member has not read.
 *
 * Drives the 전체 읽기 button's enabled state and the notice above the list.
 * Scoped to the current page because that is what this component is given; the
 * authoritative account-wide flag is `uiStore.hasUnreadInquiries`, which is what
 * actually holds the modal open.
 */
const hasUnread = computed(() =>
  (props.inquiryData?.data ?? []).some((i) => (i.member_unread ?? 0) > 0),
);
const totalPages = computed(() => props.inquiryData?.pages || 1);

const getPageNumbers = (): (number | string)[] => {
  const pages: (number | string)[] = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current <= 4) {
      for (let i = 2; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push("...");
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push("...");
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(total);
    }
  }
  return pages;
};

// Event Handlers
const handlePageChange = async (page: number) => {
  if (
    page < 1 ||
    page > totalPages.value ||
    page === currentPage.value ||
    isLoadingPage.value
  )
    return;

  isLoadingPage.value = true;
  currentPage.value = page;

  try {
    if (props.onPageChange) {
      await props.onPageChange(page);
    } else if (props.onRefresh) {
      await props.onRefresh();
    }
  } catch (error) {
    console.error("Failed to change page:", error);
  } finally {
    isLoadingPage.value = false;
  }
};

const handleToggle = async (id: string) => {
  const isExpanding = expandedId.value !== id;

  if (isExpanding) {
    expandedId.value = id;

    const inquiry = props.inquiryData?.data?.find((inq) => inq.id === id);

    // Auto-mark as read if unread
    if (inquiry && inquiry.member_unread > 0) {
      await mutations.markInquiryAsReadSilent(id);
    }

    if (!replies.value[id]) {
      loadingReplies.value = { ...loadingReplies.value, [id]: true };
      try {
        const data = await mutations.fetchReplies(id);
        if (data) {
          replies.value = { ...replies.value, [id]: data };
        }
      } finally {
        loadingReplies.value = { ...loadingReplies.value, [id]: false };
      }
    }
  } else {
    expandedId.value = null;
  }
};

// Auto-expand first unread inquiry on initial load
watch(
  () => props.inquiryData,
  async (data) => {
    if (data?.data && data.data.length > 0 && expandedId.value === null) {
      const firstUnread = data.data.find((inq) => inq.member_unread > 0);
      const targetId = firstUnread ? firstUnread.id : data.data[0]!.id;
      await handleToggle(targetId);
    }
  },
);

const handleWriteInquiry = () => {
  showForm.value = true;
};

const handleBack = () => {
  showForm.value = false;
};

const handleSubmitInquiry = async (values: {
  title: string;
  content: string;
}) => {
  isSubmitting.value = true;
  try {
    await mutations.createInquiry(values.title, values.content);
    showForm.value = false;
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = async (id: string) => {
  const confirmed = await showConfirmationAlert(
    t("inquiry.delete"),
    t("inquiry.deleteConfirmation"),
    t("common.yes"),
    t("common.no"),
    "#dc2626",
    "#6b7280",
  );
  if (confirmed) {
    await mutations.updateInquiryStatus(id, "delete");
  }
};

const handleReadAll = async () => {
  if (!hasUnread.value) return;
  // status 4 = mark read (see updateAllInquiriesStatus). No confirmation:
  // marking read is non-destructive and is the action the close guard is
  // asking for, so an extra dialog would only be in the way.
  await mutations.updateAllInquiriesStatus(4);
};

const handleDeleteAll = async () => {
  const confirmed = await showConfirmationAlert(
    t("inquiry.deleteAll"),
    t("inquiry.deleteAllConfirmation"),
    t("common.yes"),
    t("common.no"),
    "#dc2626",
    "#6b7280",
  );
  if (confirmed) {
    await mutations.updateAllInquiriesStatus("delete");
  }
};

const handleCloseInquiry = async (inquiryId: string) => {
  const confirmed = await showConfirmationAlert(
    t("inquiry.closeInquiry"),
    t("inquiry.closeInquiryConfirmation"),
    t("common.yes"),
    t("common.no"),
    "#6b7280",
    "#7e3af2",
  );
  if (!confirmed) return;

  closingInquiries.value = { ...closingInquiries.value, [inquiryId]: true };
  try {
    await mutations.closeInquiry(inquiryId);
    expandedId.value = null;
  } finally {
    closingInquiries.value = { ...closingInquiries.value, [inquiryId]: false };
  }
};

const handleSendReply = async (id: string, message: string) => {
  const data = await mutations.sendReply(id, message);
  if (data) {
    replies.value = { ...replies.value, [id]: data };
  }
};
</script>
