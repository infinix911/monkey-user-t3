<template>
  <div
    :class="[
      'rounded-lg overflow-hidden shadow-sm',
      !isExpanded ? 'rounded-[15px]' : '',
    ]"
  >
    <!-- Header.
         Unread rows get their own tinted surface rather than being sorted to
         the top: the list stays in the order the member filed the tickets in,
         which is how they look for a specific one, and the colour does the
         "deal with this" work instead. The tint is dropped once the row is
         expanded — reading it is the point, and a highlighted open row would
         still be shouting after the member has acted on it. -->
    <div
      :class="[
        isExpanded ? 'tm-accent-bar' : 'tm-card',
        !isExpanded && isUnread ? 'is-unread' : '',
        'p-3 md:p-3 md:px-4 cursor-pointer hover:opacity-95 transition-colors font-medium rounded-[15px] relative z-10',
      ]"
      @click="$emit('toggle', inquiry.id)"
    >
      <!-- ONE line: [확인/미확인] Title ......... [Date] [Delete].
           The read/unread badge replaced the status badge (새 문의 / 대기중 / …):
           what a member needs at a glance is whether there is something waiting
           for them, not the ticket's workflow state. The reply icon is gone —
           the whole row is already the toggle that opens the thread. -->
      <div class="flex items-center gap-2 md:gap-3">
        <!-- Left: read state + title -->
        <span
          :class="[
            readBadgeClass,
            'shrink-0 px-2.5 py-0.5 rounded-[29.664px] text-[11px] md:text-xs whitespace-nowrap',
          ]"
        >
          {{ isUnread ? t("inquiry.unconfirmed") : t("inquiry.confirmed") }}
        </span>
        <span
          class="min-w-0 flex-1 truncate text-white text-sm md:text-[15px]"
          :class="isUnread ? 'font-bold' : 'font-medium text-white/80'"
        >
          {{ translateToken(inquiry.title) }}
        </span>

        <!-- Right: date + delete -->
        <div class="flex shrink-0 items-center gap-2 md:gap-3">
          <span class="text-white/70 text-[11px] md:text-[12px] font-normal whitespace-nowrap tabular-nums">
            {{ inquiry.created_at }}
          </span>
          <button
            class="text-white hover:opacity-80 transition-opacity cursor-pointer"
            :aria-label="t('inquiry.delete')"
            @click.stop="$emit('delete', inquiry.id)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-[18px] h-[18px]"
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

    <!-- Expanded Content. Slides open and closed against the thread's real
         height — see the transition hooks. -->
    <Transition
      :css="false"
      @enter="onExpandEnter"
      @after-enter="onExpandAfterEnter"
      @leave="onExpandLeave"
    >
    <div
      v-if="isExpanded"
      class="overflow-hidden rounded-b-[18px] -mt-2.5"
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
          <!-- Rendered as markup: admin-authored messages are rich text. Every
               path in `renderMessage` runs the allowlist sanitizer first. -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="rich-body text-[15px] leading-relaxed break-words text-white/90"
            v-html="inquiryBodyHtml"
          />
          <!-- eslint-enable vue/no-v-html -->
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
                  <!-- Sanitized in `renderMessage`; see the note above. -->
                  <!-- eslint-disable vue/no-v-html -->
                  <div
                    v-if="reply.html"
                    class="rich-body px-3.5 py-2.5 text-[15px] leading-relaxed break-words"
                    :class="
                      isUserReply(reply)
                        ? 'tm-bubble-self rounded-[14px] rounded-br-[4px]'
                        : 'tm-card rounded-[14px] rounded-bl-[4px]'
                    "
                    v-html="reply.html"
                  />
                  <!-- eslint-enable vue/no-v-html -->
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

        <!-- Action Buttons. Both are hidden on app-raised inquiries, so the row
             collapses to nothing rather than leaving an empty bar. -->
        <div
          v-if="!isAppRaised"
          class="flex gap-2 md:gap-3 justify-end pt-1"
        >
          <button
            :disabled="isClosing"
            class="tm-btn-ghost px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors font-normal text-sm md:text-base cursor-pointer flex items-center gap-2"
            @click="$emit('close', inquiry.id)"
          >
            {{ isClosing ? t("inquiry.closing") : t("inquiry.closeInquiry") }}
          </button>
          <button
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
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type {
  InquiryItem,
  RepliesResponse,
} from "~/interfaces/inquiry.interface";
import { tiptapToHtml } from "~/composables/useTiptap";
import { escapeHtml, sanitizeHtml } from "~/utils/sanitizeHtml";

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
 *  is the one the auto-scroll lands on. The API returns newest first. Each row
 *  carries its message pre-rendered, so the template renders it once. */
const orderedReplies = computed(() =>
  [...(props.replies?.data ?? [])].map((reply) => ({
    ...reply,
    html: renderMessage(reply.message),
  })).reverse(),
);

/**
 * Whether this inquiry has replies the member has not opened yet.
 *
 * `member_unread` is the count the API keeps per ticket; it is also what
 * `uiStore.hasUnreadInquiries` aggregates to hold the modal open, so the row
 * badge and the close guard read the same source and cannot disagree.
 */
const isUnread = computed(() => (props.inquiry.member_unread ?? 0) > 0);

/**
 * 미확인 reads as the accent alert colour so an unread row is findable at a
 * glance down a long list; 확인 is muted and recedes.
 */
const readBadgeClass = computed(() =>
  isUnread.value
    ? "bg-transparent text-[#FF7575] border border-[#FF7575] font-semibold"
    : "bg-transparent text-white/45 border border-white/25",
);

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
 * member to do with them: the reply box, the send button and Close inquiry are
 * all hidden. The operator resolves the ticket from the admin side.
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

/** Markup, as opposed to a member sentence that merely contains an angle bracket. */
const HTML_TAG = /<\/?[a-z][a-z0-9-]*(?:\s[^>]*)?\/?>/i;

/**
 * Render a stored message as display HTML.
 *
 * A message reaches us in one of three shapes and all three have to survive the
 * trip to the bubble:
 *   - Tiptap JSON (a document object, or that document as a JSON string),
 *   - an HTML string — what the admin console's rich-text reply box saves,
 *   - plain text — what the member types into the textarea below.
 *
 * The HTML case is the one that was broken: it fell past the `JSON.parse`, was
 * returned as a bare string and then interpolated as text, so an operator reply
 * rendered as its literal source (`<p>New Reply Template</p>`) on screen.
 *
 * Everything goes through the deterministic allowlist sanitizer, which has no
 * DOM dependency, so SSR and hydration agree. Plain text is escaped rather than
 * sanitized so the member's own line breaks survive as `<br>`.
 */
const renderMessage = (message: unknown): string => {
  if (!message) return "";
  if (typeof message === "object") {
    return sanitizeHtml(tiptapToHtml(message as Parameters<typeof tiptapToHtml>[0]));
  }
  if (typeof message !== "string") return "";

  const value = message.trim();
  if (!value) return "";

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return sanitizeHtml(tiptapToHtml(parsed as Parameters<typeof tiptapToHtml>[0]));
    }
  } catch {
    /* not a Tiptap document — fall through to the HTML/plain-text paths */
  }

  if (HTML_TAG.test(value)) return sanitizeHtml(value);
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
};

/**
 * The member's own question. App-raised tokens (`BANK_ACCOUNT_REQUEST`) are
 * plain strings, so they take the i18n path; anything else is a real message and
 * is rendered like a reply.
 */
const inquiryBodyHtml = computed(() => {
  const raw = props.inquiry.message ?? "";
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (/^[A-Z0-9_]+$/.test(trimmed)) return escapeHtml(translateToken(trimmed));
  return renderMessage(raw);
});

const handleSendReply = () => {
  if (!replyText.value.trim()) return;
  emit("sendReply", props.inquiry.id, replyText.value.trim());
  replyText.value = "";
};

/**
 * Expand/collapse motion for the thread.
 *
 * Driven from JS (`:css="false"`) rather than a keyframe because the distance is
 * the thread's own height, which is only known at runtime — replies, an empty
 * state and a reply box all produce different sizes. The keyframe this replaced
 * animated `max-height` to a fixed 1000px, so a ~400px thread finished growing a
 * third of the way through and the rest of the duration read as a pause.
 *
 * Height is released to `auto` once open, so a thread that grows afterwards (a
 * reply arriving, replies finishing loading) is not clipped by a stale pixel
 * height.
 */
const EXPAND_MS = 300;
const COLLAPSE_MS = 250;

function onExpandEnter(el: Element, done: () => void): void {
  const node = el as HTMLElement;
  node.style.height = "0px";
  node.style.opacity = "0";
  // Read back to force layout, so the browser treats the next assignment as a
  // change to animate rather than folding both into one frame.
  void node.offsetHeight;
  node.style.transition = `height ${EXPAND_MS}ms ease-out, opacity ${EXPAND_MS}ms ease-out`;
  node.style.height = `${node.scrollHeight}px`;
  node.style.opacity = "1";
  window.setTimeout(done, EXPAND_MS);
}

function onExpandAfterEnter(el: Element): void {
  const node = el as HTMLElement;
  node.style.height = "auto";
  node.style.transition = "";
}

function onExpandLeave(el: Element, done: () => void): void {
  const node = el as HTMLElement;
  node.style.height = `${node.scrollHeight}px`;
  void node.offsetHeight;
  node.style.transition = `height ${COLLAPSE_MS}ms ease-in, opacity ${COLLAPSE_MS}ms ease-in`;
  node.style.height = "0px";
  node.style.opacity = "0";
  window.setTimeout(done, COLLAPSE_MS);
}
</script>

<style scoped>
/* Unread row. A tinted surface plus a left rule, so an unread ticket is
   identifiable at a glance without reordering the list. The rule is drawn
   with an inset shadow rather than a border so it adds no width and cannot
   shift the row against its read neighbours.

   The tint breathes slowly rather than blinking: a hard on/off flash on a
   full-width row is punishing to read past, and there may be several at
   once. Suppressed under prefers-reduced-motion. */
.is-unread {
  background:
    linear-gradient(
      90deg,
      rgba(255, 117, 117, 0.14) 0%,
      rgba(255, 117, 117, 0.05) 45%,
      transparent 100%
    ),
    var(--tm-card-bg, rgba(255, 255, 255, 0.04));
  box-shadow: inset 3px 0 0 0 #ff7575;
  animation: inq-unread-pulse 2.4s ease-in-out infinite;
}

@keyframes inq-unread-pulse {
  0%,
  100% {
    box-shadow: inset 3px 0 0 0 #ff7575;
  }

  50% {
    box-shadow:
      inset 3px 0 0 0 #ff7575,
      0 0 12px rgba(255, 117, 117, 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-unread {
    animation: none;
  }
}

/* The expand/collapse motion lives in the transition hooks above: the distance
   is the thread's runtime height, which a keyframe cannot know. */

/* Admin replies are authored in a rich-text editor, so they arrive as real
   markup. Tailwind's preflight zeroes margins and list markers, which would
   collapse a multi-paragraph reply into one run-on line inside the bubble —
   these rules give the sanitizer's allowed tags their spacing back, scoped to
   the message body so nothing leaks into the card chrome. */
.rich-body :deep(p) {
  margin: 0;
}

.rich-body :deep(p + p),
.rich-body :deep(ul),
.rich-body :deep(ol),
.rich-body :deep(blockquote),
.rich-body :deep(pre) {
  margin-top: 0.5em;
}

.rich-body :deep(ul),
.rich-body :deep(ol) {
  margin-bottom: 0.5em;
  padding-left: 1.25em;
  list-style-position: outside;
}

.rich-body :deep(ul) {
  list-style-type: disc;
}

.rich-body :deep(ol) {
  list-style-type: decimal;
}

.rich-body :deep(h1),
.rich-body :deep(h2),
.rich-body :deep(h3),
.rich-body :deep(h4),
.rich-body :deep(h5),
.rich-body :deep(h6) {
  margin-top: 0.5em;
  font-weight: 600;
  font-size: 1em;
}

.rich-body :deep(a) {
  color: var(--tm-accent);
  text-decoration: underline;
  overflow-wrap: anywhere;
}

.rich-body :deep(strong) {
  font-weight: 600;
}

.rich-body :deep(blockquote) {
  padding-left: 0.75em;
  border-left: 2px solid rgb(255 255 255 / 0.2);
  color: rgb(255 255 255 / 0.75);
}

.rich-body :deep(pre),
.rich-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
}

.rich-body :deep(pre) {
  padding: 0.5em 0.75em;
  border-radius: 8px;
  background: rgb(255 255 255 / 0.06);
  overflow-x: auto;
}

.rich-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.rich-body :deep(hr) {
  margin: 0.6em 0;
  border-color: rgb(255 255 255 / 0.15);
}

.rich-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.rich-body :deep(td),
.rich-body :deep(th) {
  padding: 0.25em 0.5em;
  border: 1px solid rgb(255 255 255 / 0.15);
}

/* A trailing empty paragraph is how the editor stores "user pressed Enter at
   the end"; it would otherwise add a blank line to every bubble. */
.rich-body :deep(p:last-child:empty) {
  display: none;
}
</style>
