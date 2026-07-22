<template>
  <Teleport to="body">
    <Transition name="app-dialog">
      <div
        v-if="dialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60"
        @click.self="onBackdrop"
      >
        <div
          :key="dialog.id"
          class="app-dialog-card animate-scale-in w-full max-w-[26rem] rounded-[18px] border-[1.5px] border-[#404040] bg-[#1e1e1e] p-6 text-center shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <!-- Close button -->
          <button
            v-if="dialog.showCloseButton"
            type="button"
            class="absolute right-4 top-4 text-[#9a9a9a] hover:text-white cursor-pointer text-xl leading-none"
            aria-label="Close"
            @click="dismissDialog"
          >
            &times;
          </button>

          <!-- Loading spinner -->
          <div v-if="dialog.loading" class="flex justify-center mb-4">
            <span
              class="inline-block h-12 w-12 rounded-full border-4 border-[#404040] border-t-[#04c000] animate-spin"
            />
          </div>

          <!-- Status icon — animated SVG (sweetalert-style draw-in) -->
          <div
            v-else-if="dialog.icon"
            :key="dialog.id"
            class="app-dialog-icon mx-auto mb-4"
            :class="`app-dialog-icon--${dialog.icon}`"
          >
            <svg
              class="app-dialog-icon-svg"
              viewBox="0 0 52 52"
              aria-hidden="true"
            >
              <circle class="app-dialog-icon-ring" cx="26" cy="26" r="24" />
              <path
                v-if="dialog.icon === 'success'"
                class="app-dialog-icon-stroke app-dialog-icon-check"
                d="M15 27 l7 7 l15 -15"
              />
              <template v-else-if="dialog.icon === 'error'">
                <line
                  class="app-dialog-icon-stroke app-dialog-icon-cross1"
                  x1="18"
                  y1="18"
                  x2="34"
                  y2="34"
                />
                <line
                  class="app-dialog-icon-stroke app-dialog-icon-cross2"
                  x1="34"
                  y1="18"
                  x2="18"
                  y2="34"
                />
              </template>
            </svg>
            <span
              v-if="dialog.icon !== 'success' && dialog.icon !== 'error'"
              class="app-dialog-icon-glyph"
              >{{ iconGlyph }}</span
            >
          </div>

          <h2
            class="font-line-seed text-[#ffe100] text-[1.3rem] font-bold leading-snug break-words"
          >
            {{ dialog.title }}
          </h2>

          <div
            v-if="dialog.html"
            class="font-line-seed text-[#d0d0d0] text-[0.95rem] mt-2 break-words"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="safeHtml" />
          </div>
          <p
            v-else-if="dialog.text"
            class="font-line-seed text-[#d0d0d0] text-[0.95rem] mt-2 break-words whitespace-pre-line"
          >
            {{ dialog.text }}
          </p>

          <!-- Buttons -->
          <div
            v-if="!dialog.loading && (showConfirm || dialog.showCancelButton)"
            class="mt-6 flex items-center justify-center gap-3"
          >
            <button
              v-if="dialog.showCancelButton"
              type="button"
              class="font-line-seed inline-flex items-center justify-center rounded-[10px] px-8 py-[0.6rem] text-[0.95rem] font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
              :style="{ backgroundColor: dialog.cancelButtonColor || '#6b7280' }"
              @click="dismissDialog"
            >
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="cancelLabel" />
            </button>
            <button
              v-if="showConfirm"
              ref="confirmBtn"
              type="button"
              class="font-line-seed inline-flex items-center justify-center rounded-[10px] px-8 py-[0.6rem] text-[0.95rem] font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
              :style="{ backgroundColor: dialog.confirmButtonColor || '#04c000' }"
              @click="confirmDialog"
            >
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="confirmLabel" />
            </button>
          </div>

          <!-- Timer progress bar -->
          <div
            v-if="dialog.timer && dialog.timerProgressBar"
            class="mt-4 h-1 w-full overflow-hidden rounded bg-[#404040]"
          >
            <div
              class="h-full bg-[rgba(255,225,0,0.5)] app-dialog-timerbar"
              :style="{ animationDuration: `${dialog.timer}ms` }"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useDialogQueue } from "@/composables/useDialogQueue";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

const { activeDialog, confirmDialog, dismissDialog } = useDialogQueue();

const dialog = activeDialog;
const confirmBtn = ref<HTMLButtonElement | null>(null);
let timerId: ReturnType<typeof setTimeout> | null = null;

const ICON_GLYPHS: Record<string, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
  question: "?",
};

const iconGlyph = computed(() =>
  dialog.value?.icon ? ICON_GLYPHS[dialog.value.icon] : "",
);

// Confirm button shows unless explicitly disabled (default true, matching swal).
const showConfirm = computed(() => dialog.value?.showConfirmButton !== false);

const safeHtml = computed(() => sanitizeHtml(dialog.value?.html ?? ""));

// Button labels may carry inline markup (e.g. an SVG check/cross icon), matching
// sweetalert's HTML-capable button text. Sanitized before rendering.
const confirmLabel = computed(() =>
  sanitizeHtml(dialog.value?.confirmButtonText || "OK"),
);
const cancelLabel = computed(() =>
  sanitizeHtml(dialog.value?.cancelButtonText || "No"),
);

const onBackdrop = () => {
  // Default allowOutsideClick is true (swal parity). Loading dialogs opt out.
  if (dialog.value?.allowOutsideClick !== false && !dialog.value?.loading) {
    dismissDialog();
  }
};

const onKeydown = (e: KeyboardEvent) => {
  if (!dialog.value) return;
  if (e.key === "Escape" && dialog.value.allowEscapeKey !== false) {
    dismissDialog();
  } else if (e.key === "Enter" && showConfirm.value && !dialog.value.loading) {
    confirmDialog();
  }
};

const clearTimer = () => {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
};

watch(
  dialog,
  (d) => {
    clearTimer();
    if (!d) {
      if (import.meta.client)
        window.removeEventListener("keydown", onKeydown);
      return;
    }

    if (import.meta.client) {
      window.addEventListener("keydown", onKeydown);
      // Focus the confirm button so Enter/space works immediately.
      nextTick(() => confirmBtn.value?.focus());
    }

    if (d.timer) {
      timerId = setTimeout(() => dismissDialog(), d.timer);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearTimer();
  if (import.meta.client) window.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.app-dialog-card {
  position: relative;
  font-family: "LINE Seed", system-ui, sans-serif;
}

/* Animated circular status icon — the in-house take on the .swal2-icon look.
   The ring strokes in first, then the check/cross draws (or the glyph pops). */
.app-dialog-icon {
  position: relative;
  width: 4.5rem;
  height: 4.5rem;
}

.app-dialog-icon-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.app-dialog-icon-ring {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  opacity: 0.4;
  stroke-dasharray: 151;
  stroke-dashoffset: 151;
  animation: app-dialog-ring-draw 0.45s ease-out forwards;
}

.app-dialog-icon-stroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.app-dialog-icon-check {
  stroke-dasharray: 42;
  stroke-dashoffset: 42;
  animation: app-dialog-stroke-draw 0.35s 0.35s ease-out forwards;
}

.app-dialog-icon-cross1 {
  stroke-dasharray: 26;
  stroke-dashoffset: 26;
  animation: app-dialog-stroke-draw 0.25s 0.3s ease-out forwards;
}

.app-dialog-icon-cross2 {
  stroke-dasharray: 26;
  stroke-dashoffset: 26;
  animation: app-dialog-stroke-draw 0.25s 0.45s ease-out forwards;
}

.app-dialog-icon-glyph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1;
  color: currentColor;
  animation: app-dialog-glyph-pop 0.4s 0.2s both;
}

@keyframes app-dialog-ring-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes app-dialog-stroke-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes app-dialog-glyph-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

.app-dialog-icon--success {
  color: #04c000;
}
.app-dialog-icon--error {
  color: #f44336;
}
.app-dialog-icon--warning {
  color: #ff9800;
}
.app-dialog-icon--info {
  color: #3b82f6;
}
.app-dialog-icon--question {
  color: #a78bfa;
}

.app-dialog-timerbar {
  width: 100%;
  transform-origin: left;
  animation-name: app-dialog-timer;
  animation-timing-function: linear;
}

@keyframes app-dialog-timer {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.app-dialog-enter-active,
.app-dialog-leave-active {
  transition: opacity 0.18s ease;
}
.app-dialog-enter-from,
.app-dialog-leave-to {
  opacity: 0;
}

/* Bouncy "swal show" pop — overshoots to 1.05 then settles. */
.animate-scale-in {
  animation: app-dialog-pop 0.34s ease-out;
}
@keyframes app-dialog-pop {
  0% {
    transform: scale(0.7);
    opacity: 0;
  }
  45% {
    transform: scale(1.05);
    opacity: 1;
  }
  80% {
    transform: scale(0.97);
  }
  100% {
    transform: scale(1);
  }
}

/* Accessibility: honor reduced-motion — drop the pop & icon draws, keep a
   plain fade and render icons in their final state. Mirrors main.css. */
@media (prefers-reduced-motion: reduce) {
  .animate-scale-in,
  .app-dialog-icon-glyph {
    animation: none;
  }
  .app-dialog-icon-ring,
  .app-dialog-icon-check,
  .app-dialog-icon-cross1,
  .app-dialog-icon-cross2 {
    animation: none;
    stroke-dashoffset: 0;
  }
  .app-dialog-enter-active,
  .app-dialog-leave-active {
    transition: opacity 0.12s ease;
  }
}
</style>
