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
        isExpanded ? 'tm-accent-bar' : 'tm-card',
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
              class="tm-btn text-[11px] font-semibold px-2 py-0.5 rounded-full"
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
      <div
        class="tm-card border-t-0 rounded-b-[18px] rounded-t-none pt-[22px] px-4 pb-4 space-y-4 font-normal"
      >
        <!-- Initial Inquiry Message — the member's own question, kept visually
             distinct from the thread below it (accent rule + label) so the
             ticket always opens with its subject matter in view. -->
        <div
          v-if="inquiry.message"
          class="tm-card rounded-[10px] border-l-[3px] px-3.5 py-3"
          :style="{ borderLeftColor: 'var(--tm-accent)' }"
        >
          <span
            class="block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40 mb-1.5"
          >
            {{ t("inquiry.body") }}
          </span>
          <p class="text-[15px] leading-relaxed break-words text-white/90">
            {{ translateToken(extractTextFromMessage(inquiry.message)) }}
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingReplies" class="py-2">
          <div class="animate-pulse space-y-3 w-full">
            <div class="tm-card h-12 w-3/4 rounded-[12px]" />
            <div class="tm-card h-12 w-2/3 rounded-[12px] ml-auto" />
          </div>
        </div>

        <!-- Replies Section — a conversation, so it reads like one: the
             member's own replies sit right/blue, the operator's left/grey, and
             the container scrolls to the newest message (see the watcher). -->
        <div v-else>
          <div
            v-if="hasReplies"
            class="flex items-center gap-2 mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40"
          >
            <span>{{ t("inquiry.replies") }}</span>
            <span class="h-px flex-1 bg-white/10" />
          </div>

          <div
            ref="repliesContainerRef"
            class="tm-scroll flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1"
          >
            <!-- All Replies - Reversed so latest appears at bottom -->
            <template v-if="hasReplies">
              <div
                v-for="reply in orderedReplies"
                :key="reply.id"
                class="flex items-end gap-2"
                :class="isUserReply(reply) ? 'flex-row-reverse' : 'flex-row'"
              >
                <!-- Author chip: the member gets their accent, the operator the
                     neutral one, so a glance at the colour identifies the side
                     even before reading the name. -->
                <span
                  class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  :class="
                    isUserReply(reply)
                      ? 'tm-bubble-self'
                      : 'tm-card tm-accent-text'
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"
                    />
                  </svg>
                </span>

                <div
                  class="min-w-0 max-w-[80%] flex flex-col gap-1"
                  :class="isUserReply(reply) ? 'items-end' : 'items-start'"
                >
                  <div
                    class="flex items-center gap-2 px-0.5 text-[11px] leading-none"
                    :class="isUserReply(reply) ? 'flex-row-reverse' : ''"
                  >
                    <span class="font-semibold text-white/70">
                      {{ isUserReply(reply) ? t("common.you") : "Admin" }}
                    </span>
                    <span class="text-white/35">
                      {{ formatTimeAgo(reply.created_at) }}
                    </span>
                  </div>
                  <p
                    v-if="extractTextFromMessage(reply.message)"
                    class="px-3.5 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-line"
                    :class="
                      isUserReply(reply)
                        ? 'tm-bubble-self rounded-[14px] rounded-br-[4px]'
                        : 'tm-card rounded-[14px] rounded-bl-[4px]'
                    "
                  >
                    {{ extractTextFromMessage(reply.message) }}
                  </p>
                </div>
              </div>
            </template>

            <!-- No Replies Message -->
            <div v-else class="text-center py-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-7 h-7 text-white/25 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p class="text-white/45 text-sm">
                {{ t("inquiry.noReplies") }}
              </p>
            </div>
          </div>
        </div>

        <!-- Reply Text Area — hidden on app-raised inquiries, which the member
             has nothing to reply to. -->
        <div v-if="!isAppRaised">
          <!-- Ctrl/⌘+Enter sends, matching every other chat box the member has
               used; the button stays the discoverable path. -->
          <textarea
            v-model="replyText"
            :placeholder="t('inquiry.writeReplyPlaceholder')"
            rows="3"
            class="tm-field w-full px-3.5 py-3 text-sm font-normal resize-none outline-none transition-colors min-h-[92px]"
            @keydown.ctrl.enter.prevent="handleSendReply"
            @keydown.meta.enter.prevent="handleSendReply"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 md:gap-3 justify-end pt-1">
          <button
            :disabled="isClosing"
            class="tm-btn-ghost px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors font-normal text-sm md:text-base cursor-pointer flex items-center gap-2"
            @click="$emit('close', inquiry.id)"
          >
            {{ isClosing ? t("inquiry.closing") : t("inquiry.closeInquiry") }}
          </button>
          <button
            v-if="!isAppRaised"
            :disabled="!replyText.trim()"
            class="tm-btn px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors font-normal text-sm md:text-base shadow-sm cursor-pointer flex items-center gap-2"
            @click="handleSendReply"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
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

/** Whether the ticket has any reply to render as a thread. */
const hasReplies = computed(() => (props.replies?.data?.length ?? 0) > 0);

/** Oldest → newest, so the conversation reads downwards and the newest message
 *  is the one the auto-scroll lands on. The API returns newest first. */
const orderedReplies = computed(() => [...(props.replies?.data ?? [])].reverse());

const statusBadgeClass = computed(() => {
  if (props.isExpanded) {
    return "text-white border border-white";
  }
  switch (props.inquiry.status) {
    case 1:
      return "bg-transparent text-white border border-white";
    case 2:
      return "bg-transparent tm-accent-text border border-current";
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

/**
 * Inquiries the app raised on the member's behalf rather than ones they typed.
 * They are a one-way record for the admin to act on, so there is nothing for the
 * member to reply to — the reply box and its send button are hidden. Closing the
 * ticket stays available.
 */
const APP_RAISED_TITLES = new Set(["BANK_ACCOUNT_REQUEST"]);

const isAppRaised = computed(() => APP_RAISED_TITLES.has(props.inquiry.title));

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
