<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start justify-center"
        :class="'bg-[#131313]'"
      >
        <div
          class="!gap-0 bg-transparent border-0 p-0 w-full max-w-[calc(100%-2rem)] lg:max-w-4xl shadow-2xl flex flex-col lg:h-auto rounded-none lg:rounded-xl overflow-hidden m-0 lg:m-auto lg:mt-8"
        >
          <!-- Modal Header - Transparent Background -->
          <div class="flex items-center justify-between px-5 pt-4 mb-2 lg:pt-6">
            <h2
              class="text-[24px] lg:text-[45.933px] text-white lg:leading-[73.951px]"
            >
              {{ t("inquiry.title") }}
            </h2>
            <button
              class="transition-colors hover:text-gray-300 cursor-pointer text-white"
              :aria-label="t('common.close')"
              @click="handleCloseClick"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Modal Content - With Background -->
          <div
            class="px-4 relative flex-1 min-h-0 bg-[#2a2a2a] lg:bg-[#131313] rounded-xl mx-4 lg:mx-0 lg:rounded-none flex flex-col"
            style="min-height: 500px"
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
import { ref, watch } from "vue";
import { useApi } from "@/composables/useApi";
import { getDateRangeLastNDays } from "~/lib/date";
import type { InquiryResponse } from "./InquiryContent.vue";
import { showErrorAlert } from "~~/utils/swal-alert";

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

const INQUIRY_DATE_RANGE = 30;
const INQUIRY_LIMIT = 10;

const inquiryData = ref<InquiryResponse | null>(null);
const currentPage = ref(1);

const fetchInquiryData = async (page: number = 1) => {
  try {
    const { startDate, endDate } = getDateRangeLastNDays(INQUIRY_DATE_RANGE);
    const apiUrl = `/inquiries?page=${page}&limit=${INQUIRY_LIMIT}&start_date=${startDate}&end_date=${endDate}`;
    const api = useApi();
    const data = await api<InquiryResponse>(apiUrl);

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

// Fetch data when modal opens
watch(
  () => props.isOpen,
  async (open) => {
    if (open && !inquiryData.value) {
      await fetchInquiryData(1);
    }
  },
);

const handleCloseClick = async () => {
  if (uiStore.hasUnreadInquiries) {
    await showErrorAlert(
      t("inquiry.unreadMessages"),
      t("inquiry.mustReadMessages"),
    );
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
