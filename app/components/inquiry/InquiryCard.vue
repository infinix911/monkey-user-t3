<template>
  <div
    :class="[
      'rounded-lg overflow-hidden shadow-sm',
      !isExpanded ? 'rounded-[15px]' : '',
    ]"
  >
    <!-- Header -->
    <div
      :class="[
        isExpanded ? 'bg-[#285EFF]' : 'bg-[#46506D]',
        'p-3 md:p-3 md:px-4 cursor-pointer hover:opacity-95 transition-colors font-medium rounded-[15px] relative z-10',
      ]"
      @click="$emit('toggle', inquiry.id)"
    >
      <div class="flex flex-col gap-0">
        <!-- First row: Status and Question -->
        <div class="flex items-center gap-2 md:gap-2">
          <span
            :class="[
              statusBadgeClass,
              'px-3 rounded-[29.664px] text-xs md:text-xs whitespace-nowrap',
            ]"
          >
            {{ t(`inquiry.state.${String(inquiry.status)}`) }}
          </span>
          <span
            class="text-white text-base md:text-sm lg:text-base flex-1 font-bold"
          >
            {{ translateToken(inquiry.title) }}
          </span>
        </div>

        <!-- Second row: Date and Icons -->
        <div class="flex items-center justify-between mt-0.5">
          <div class="flex items-center gap-2">
            <span class="text-white/90 text-[13px] font-normal">
              {{ inquiry.created_at }}
            </span>
            <!-- Unread Badge -->
            <span
              v-if="inquiry.member_unread > 0"
              class="bg-[#FFE100] text-black text-[11px] font-semibold px-2 py-0.5 rounded-full"
            >
              {{ t("inquiry.unreadMessage") }}
            </span>
          </div>
          <div class="flex items-center gap-3 md:gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="23"
              height="23"
              viewBox="0 0 33 33"
              fill="none"
            >
              <g clip-path="url(#clip0_inquiry_icon)">
                <path
                  d="M26.125 8.25C28.4032 8.25 30.25 6.40317 30.25 4.125C30.25 1.84683 28.4032 0 26.125 0C23.8468 0 22 1.84683 22 4.125C22 6.40317 23.8468 8.25 26.125 8.25Z"
                  fill="#EFEFEF"
                />
                <path
                  d="M8.25 11V8.25H20.6663C19.0025 6.05 19.1812 3.83625 19.4012 2.75H5.51375C4.00125 2.75 2.76375 3.97375 2.76375 5.5L2.75 30.25L8.25 24.75H27.5C29.0125 24.75 30.25 23.5125 30.25 22V9.58375C29.095 10.4637 27.6787 11 26.125 11H8.25ZM19.25 19.25H8.25V16.5H19.25V19.25ZM24.75 15.125H8.25V12.375H24.75V15.125Z"
                  fill="#EFEFEF"
                />
              </g>
              <defs>
                <clipPath id="clip0_inquiry_icon">
                  <rect width="33" height="33" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <button
              class="text-white hover:opacity-80 transition-opacity cursor-pointer"
              @click.stop="$emit('delete', inquiry.id)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Expanded Content -->
    <div
      v-if="isExpanded"
      class="overflow-hidden rounded-b-[18px] inquiry-expand-animation -mt-2.5"
    >
      <div class="bg-[#D6D6D6] p-4 space-y-4 font-normal">
        <!-- Initial Inquiry Message -->
        <div
          v-if="inquiry.message"
          class="mt-[14px] mb-2 pb-2 border-b border-[#B0B0B0]/50"
        >
          <div class="flex-1">
            <div class="text-[#545454] rounded-lg">
              <p class="text-base leading-relaxed break-words text-black">
                {{ translateToken(extractTextFromMessage(inquiry.message)) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingReplies" class="flex justify-center py-6">
          <div class="animate-pulse space-y-3 w-full">
            <div class="h-12 bg-[#B0B0B0] rounded-lg" />
            <div class="h-12 bg-[#B0B0B0] rounded-lg" />
          </div>
        </div>

        <!-- Replies Section -->
        <div
          v-else
          ref="repliesContainerRef"
          class="space-y-1 max-h-[300px] overflow-y-auto pr-2"
        >
          <!-- All Replies - Reversed so latest appears at bottom -->
          <div v-if="replies && replies.data && replies.data.length > 0">
            <div
              v-for="reply in [...replies.data].reverse()"
              :key="reply.id"
              class="flex items-start gap-2 mb-2 border-b border-[#B0B0B0]/50 pb-4 mt-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                viewBox="0 0 44 44"
                fill="none"
                class="flex-shrink-0"
              >
                <g :clip-path="`url(#clip_reply_${reply.id})`">
                  <path
                    d="M21.9998 3.66669C11.8798 3.66669 3.6665 11.88 3.6665 22C3.6665 32.12 11.8798 40.3334 21.9998 40.3334C32.1198 40.3334 40.3332 32.12 40.3332 22C40.3332 11.88 32.1198 3.66669 21.9998 3.66669ZM21.9998 11C25.5382 11 28.4165 13.8784 28.4165 17.4167C28.4165 20.955 25.5382 23.8334 21.9998 23.8334C18.4615 23.8334 15.5832 20.955 15.5832 17.4167C15.5832 13.8784 18.4615 11 21.9998 11ZM21.9998 36.6667C18.2782 36.6667 13.8782 35.1634 10.7432 31.3867C13.8415 28.9667 17.7465 27.5 21.9998 27.5C26.2532 27.5 30.1582 28.9667 33.2565 31.3867C30.1215 35.1634 25.7215 36.6667 21.9998 36.6667Z"
                    fill="black"
                  />
                </g>
                <defs>
                  <clipPath :id="`clip_reply_${reply.id}`">
                    <rect width="44" height="44" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <div class="flex-1 min-w-0 mt-0.5">
                <div class="flex items-center gap-2">
                  <span
                    class="text-black text-md md:text-base py-1 rounded-full"
                  >
                    {{ isUserReply(reply) ? t("common.you") : "Admin" }}
                  </span>
                  <span class="text-[#666666] text-xs mt-1">
                    {{ formatTimeAgo(reply.created_at) }}
                  </span>
                </div>
                <div
                  v-if="extractTextFromMessage(reply.message)"
                  class="text-[#545454] rounded-lg"
                >
                  <p
                    class="text-base leading-relaxed break-words text-black font-normal"
                  >
                    {{ extractTextFromMessage(reply.message) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- No Replies Message -->
          <div
            v-if="!replies || !replies.data || replies.data.length === 0"
            class="text-center py-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 md:w-5 md:h-5 text-[#999999] mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p class="text-[#666666] text-sm md:text-base">
              {{ t("inquiry.noReplies") }}
            </p>
          </div>
        </div>

        <!-- Reply Text Area -->
        <div>
          <textarea
            v-model="replyText"
            :placeholder="t('inquiry.writeReplyPlaceholder')"
            rows="4"
            class="w-full rounded-[10px] bg-[#B0B0B0] border-0 p-3 md:p-2 text-[#000] text-sm font-normal resize-none outline-none focus:ring-2 ring-[#2563EB]/20 min-h-[120px]"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 md:gap-3 justify-end pt-2">
          <button
            :disabled="isClosing"
            class="bg-[#757575] hover:bg-[#616161] active:bg-[#525252] text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-sm font-normal"
            @click="$emit('close', inquiry.id)"
          >
            {{ isClosing ? t("inquiry.closing") : t("inquiry.closeInquiry") }}
          </button>
          <button
            class="bg-[#285EFF] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors font-medium text-sm md:text-base shadow-sm cursor-pointer flex items-center gap-2 font-normal"
            @click="handleSendReply"
          >
            {{ t("inquiry.sendReply") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type {
  InquiryItem,
  RepliesResponse,
} from "~/interfaces/inquiry.interface";

interface Props {
  inquiry: InquiryItem;
  isExpanded: boolean;
  replies?: RepliesResponse;
  isLoadingReplies: boolean;
  isClosing: boolean;
}

interface Emits {
  (e: "toggle" | "delete" | "close", id: string): void;
  (e: "sendReply", id: string, message: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t, te } = useI18n();
const repliesContainerRef = ref<HTMLDivElement | null>(null);
const replyText = ref("");

// Auto-scroll to bottom when replies load
watch(
  () => [props.replies, props.isLoadingReplies],
  async () => {
    if (
      repliesContainerRef.value &&
      !props.isLoadingReplies &&
      props.replies?.data?.length
    ) {
      await nextTick();
      repliesContainerRef.value.scrollTop =
        repliesContainerRef.value.scrollHeight;
    }
  },
);

const statusBadgeClass = computed(() => {
  if (props.isExpanded) {
    return "text-white border border-white";
  }
  switch (props.inquiry.status) {
    case 1:
      return "bg-transparent text-white border border-white";
    case 2:
      return "bg-transparent text-[#FFE100] border border-[#FFE100]";
    case 0:
    case 9:
      return "bg-transparent text-[#FF7575] border border-[#FF7575]";
    default:
      return "bg-transparent text-white border border-white";
  }
});

/**
 * Render app-raised inquiries through their i18n label.
 *
 * Some inquiries are raised by the app rather than typed by the member — the
 * deposit modal's "account request" posts the literal token
 * `BANK_ACCOUNT_REQUEST` as both title and body so the admin side can recognise
 * it without string matching (see `useInquiryMutations.requestBankAccount`).
 * Left alone those tokens reach the screen verbatim, so token-shaped values are
 * looked up in `inquiry.apiMessages.<TOKEN>`. Anything the member actually
 * typed is not token-shaped and passes through untouched.
 */
const translateToken = (value: string): string => {
  if (!/^[A-Z0-9_]+$/.test(value)) return value;
  const key = `inquiry.apiMessages.${value}`;
  return te(key) ? t(key) : value;
};

const isUserReply = (reply: { sender_type: string }): boolean => {
  return reply.sender_type === "member" || reply.sender_type === "user";
};

const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return dateString;
  }
};

const extractTextFromMessage = (message: unknown): string => {
  if (!message) return "";
  if (typeof message === "string") {
    // Try parsing as JSON (tiptap content)
    try {
      const parsed = JSON.parse(message);
      return extractFromJSON(parsed);
    } catch {
      return message;
    }
  }
  // Handle case where message is already a parsed object (from API)
  if (typeof message === "object") {
    return extractFromJSON(message);
  }
  return "";
};

const extractFromJSON = (content: unknown): string => {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object") {
    const obj = content as { text?: string; content?: unknown[]; type?: string };
    let text = "";
    if (obj.text) text += obj.text;
    if (obj.content && Array.isArray(obj.content)) {
      obj.content.forEach((node: unknown) => {
        text += extractFromJSON(node);
        const n = node as { type?: string };
        if (n.type === "paragraph" || n.type === "heading") text += " ";
      });
    }
    return text.trim();
  }
  return "";
};

const handleSendReply = () => {
  if (!replyText.value.trim()) return;
  emit("sendReply", props.inquiry.id, replyText.value.trim());
  replyText.value = "";
};
</script>

<style scoped>
.inquiry-expand-animation {
  animation: slideDown 0.3s ease-out;
  max-height: 1000px;
  opacity: 1;
}

@keyframes slideDown {
  0% {
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    max-height: 1000px;
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
