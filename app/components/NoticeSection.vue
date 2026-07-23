<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div
        v-if="uiStore.showNoticeModal"
        class="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto px-4 py-4 bg-black/70"
        :style="noticeVars"
      >
        <div class="w-full max-w-[560px] mx-auto flex flex-col items-center">
          <!-- Brand logo above the card -->
          <NuxtImg
            :src="siteConfig.identity.logo"
            :alt="siteConfig.identity.siteName"
            class="h-auto max-h-[44px] sm:max-h-[52px] w-auto mb-4 drop-shadow"
            loading="eager"
          />

          <!-- Notice Card -->
          <div class="notice-card w-full rounded-[24px] overflow-hidden">
            <!-- Scrollable Content -->
            <div
              class="overflow-y-auto overflow-x-hidden px-6 pt-7 md:px-8 md:pt-8 notice-content"
              style="max-height: calc(100vh - 300px)"
            >
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="noticeHtml" />
            </div>

            <!-- Action Bar -->
            <div class="px-6 md:px-8 pt-4 pb-6">
              <div class="notice-divider mb-5" />
              <div class="flex justify-center gap-3">
                <button
                  type="button"
                  class="notice-btn notice-btn--agree"
                  @click="handleAgree"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {{ $t("notice.agree") }}
                </button>
                <button
                  type="button"
                  class="notice-btn notice-btn--disagree"
                  @click="handleDisagree"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {{ $t("notice.disagree") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { renderRichContent } from "~/composables/useTiptap";

const authStore = useAuthStore();
const uiStore = useUiStore();
const siteConfig = useSiteConfig();

// Dedicated notice-modal theme (theme.noticeModal) — grey glass card border +
// gradient and the agree/disagree button colours. CMS-overridable.
const nm = computed(() => siteConfig.theme.noticeModal);
const noticeVars = computed(() => ({
  "--notice-bg": nm.value.cardGradient,
  "--notice-border": nm.value.borderColor,
  "--notice-divider": nm.value.dividerColor,
  "--notice-agree": nm.value.agreeColor,
  "--notice-disagree": nm.value.disagreeColor,
}));

const noticeHtml = computed(() => renderRichContent(uiStore.noticeContent));

const handleAgree = () => {
  uiStore.setShowNoticeModal(false);
};

const handleDisagree = () => {
  uiStore.setShowNoticeModal(false);
  authStore.logout();
};
</script>

<style>
.notice-card {
  /* Grey glass: light-grey top/bottom → near-black middle gradient, over a
     subtle light-grey border and a soft outer shadow. Both come from
     theme.noticeModal (CMS-overridable) via the --notice-* vars. */
  background: var(--notice-bg);
  border: 1px solid var(--notice-border);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
}

.notice-divider {
  height: 1px;
  background: var(--notice-divider);
}

/* Outline action buttons — green "agree" / red "disagree" on transparent fill. */
.notice-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  border: 1px solid;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notice-btn:active {
  transform: scale(0.97);
}

.notice-btn--agree {
  color: var(--notice-agree);
  border-color: color-mix(in srgb, var(--notice-agree) 55%, transparent);
}

.notice-btn--agree:hover {
  background: color-mix(in srgb, var(--notice-agree) 10%, transparent);
  border-color: color-mix(in srgb, var(--notice-agree) 90%, transparent);
}

.notice-btn--disagree {
  color: var(--notice-disagree);
  border-color: color-mix(in srgb, var(--notice-disagree) 55%, transparent);
}

.notice-btn--disagree:hover {
  background: color-mix(in srgb, var(--notice-disagree) 10%, transparent);
  border-color: color-mix(in srgb, var(--notice-disagree) 90%, transparent);
}

.notice-content {
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.75;
  /* The body is admin-authored, so it may contain a long unbroken run (a URL,
     or prose whose spaces were lost in the CMS). Break inside such a run rather
     than let it widen the card and raise a horizontal scrollbar. */
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* Children that carry their own intrinsic width must scroll inside themselves
   or shrink — never push the modal wider than the card. */
.notice-content img,
.notice-content video {
  max-width: 100%;
  height: auto;
}

.notice-content pre {
  white-space: pre-wrap;
  overflow-x: auto;
}

.notice-content table {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.notice-content p {
  margin-bottom: 0.6rem;
}

.notice-content ul,
.notice-content ol {
  padding-left: 1.5rem;
  margin-bottom: 0.6rem;
}

.notice-content ol {
  list-style-type: decimal;
}

.notice-content ul {
  list-style-type: disc;
}

.notice-content a {
  color: #60a5fa;
  text-decoration: underline;
}

.notice-content h1,
.notice-content h2,
.notice-content h3 {
  color: #e2e8f0;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.notice-content blockquote {
  border-left: 3px solid #3a3f50;
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: #94a3b8;
}

.notice-content hr {
  border-color: #3a3f50;
  margin: 1rem 0;
}

.notice-content strong {
  color: #e2e8f0;
}
</style>
