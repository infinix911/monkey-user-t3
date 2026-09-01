<template>
  <div ref="dropdownRef" class="relative" data-notification-dropdown>
    <!-- Trigger slot -->
    <div ref="triggerRef" :class="triggerClass" @click="toggleDropdown">
      <slot />
    </div>

    <!-- Dropdown content. Teleported to body so it escapes any
         overflow-hidden / scaled ancestor (notably the mobile header
         container). Position is computed from the trigger's
         getBoundingClientRect() when the dropdown opens. -->
    <!-- ClientOnly: a <Teleport> cannot be hydrated reliably here. The panel is
         closed on load, so the server emits only the teleport's comment anchors,
         and hydrateTeleport then fails to line them up with the client's — Vue
         reports "Hydration node mismatch ... expected Symbol(v-cmt)" at this
         component. It never surfaced while the session was resolved on the
         client, because this whole subtree is authenticated-only and so never
         server-rendered; it appeared the moment SSR started resolving the
         member. Nothing is lost by skipping it on the server: a closed dropdown
         has no SSR or SEO value. -->
    <ClientOnly>
      <Teleport to="body">
      <!-- Backdrop, as the inquiry/deposit/withdrawal modals have — but ONLY
           when the panel is centred (`isSheet`), which is when it is presenting
           as a modal. Anchored to the desktop header bell it is a dropdown, and
           dimming the whole page behind a dropdown would be wrong.
           `bg-black/90` is the value those modals settled on. Carries the
           dropdown's data attribute so the document click-outside handler
           ignores it, and closes on its own click instead. -->
      <Transition name="dropdown">
        <div
          v-if="isOpen && isSheet"
          data-notification-dropdown
          class="fixed inset-0 z-[9998] bg-black/90"
          @click="isOpen = false"
        />
      </Transition>
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          data-notification-dropdown
          class="tm-modal modal-body-fill fixed border border-[var(--tm-accent)]/40 rounded-xl shadow-2xl p-0 overflow-hidden w-[calc(100vw-2rem)] md:w-[450px] md:min-w-[450px] z-[9999]"
          :style="[modalTheme, {
            top: panelPos.top + 'px',
            right: panelPos.right === null ? undefined : panelPos.right + 'px',
            left: panelPos.left === null ? undefined : panelPos.left + 'px',
            boxShadow:
              '0 0 30px color-mix(in srgb, var(--tm-accent) 30%, transparent), 0 4px 20px rgba(0, 0, 0, 0.5)',
          }]"
        >
        <!-- Header -->
        <div class="tm-thead relative p-3 border-b border-[var(--tm-accent)]/30">
          <div class="flex items-center justify-between">
            <h3 class="text-white text-lg font-bold flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[var(--tm-accent)] animate-pulse" />
              {{ t("notifications.title") }}
            </h3>
            <div class="flex items-center gap-2">
              <div
                class="tm-card tm-muted text-xs px-2 py-1 rounded-full"
              >
                {{ notifications.length }}
                {{
                  notifications.length === 1
                    ? t("notifications.notification")
                    : t("notifications.notifications")
                }}
              </div>
              <!-- Explicit close: the backdrop and an outside click both
                   dismiss the panel, but as a full-width sheet on mobile it
                   reads as a modal, and a modal is expected to have one. -->
              <button
                type="button"
                class="tm-muted transition-colors hover:text-white cursor-pointer"
                :aria-label="t('common.close')"
                @click="isOpen = false"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="tm-scroll max-h-96 overflow-y-auto">
          <div
            v-if="filteredNotifications.length === 0"
            class="text-center py-16"
          >
            <p class="tm-muted text-sm font-medium mb-2">
              {{ t("notifications.empty") }}
            </p>
          </div>
          <div v-else class="p-2 space-y-3">
            <div
              v-for="(dateNotifications, dateKey) in groupedNotifications"
              :key="dateKey"
              class="space-y-2"
            >
              <!-- Date Header -->
              <div class="flex items-center gap-3 px-2">
                <h3 class="text-white text-sm font-semibold">{{ dateKey }}</h3>
                <div
                  class="flex-1 h-px bg-gradient-to-r from-[var(--tm-accent)]/50 to-transparent"
                />
              </div>

              <!-- Notifications for this date -->
              <div class="space-y-2">
                <div
                  v-for="notification in dateNotifications"
                  :key="notification.id"
                  class="group relative rounded-lg p-2 transition-all duration-200 cursor-pointer"
                  role="button"
                  tabindex="0"
                >
                  <div class="flex items-start gap-2">
                    <div class="flex-shrink-0 flex items-center justify-center">
                      <span class="text-lg">{{
                        getIcon(notification.category)
                      }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <h4
                          class="text-white font-semibold text-sm group-hover:text-[var(--tm-accent)] transition-colors duration-200"
                        >
                          {{ truncate(notification.title, 50) }}
                        </h4>
                        <span
                          v-if="!notification.is_read"
                          class="tm-btn text-xs px-2 py-0.5 rounded-full font-medium shadow-md"
                        >
                          {{ t("notifications.new") }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

export interface Notification {
  id: number;
  category: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  notifications?: Notification[];
  /**
   * Classes for the trigger wrapper around the slot. The wrapper is sized by
   * its content by default, which is right for the header bell; a caller that
   * stretches this component (the bottom nav gives it a `flex-1` column) needs
   * the trigger to fill that box too, or the slot content sits at the top of
   * the column instead of centred in it.
   */
  triggerClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  notifications: () => [],
  triggerClass: "",
});
const { markNotificationsRead } = useNotifications();

const { t } = useI18n();

/** Deposit/withdraw palette. The panel used its own gold (#D4AF37), which was
 *  a second, slightly different accent from the themed one. */
const modalTheme = useModalTheme();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const isMarkingAllRead = ref(false);

// Teleported panel uses fixed positioning; recompute coordinates from the
// trigger element on each open. The mobile header sits inside an
// `overflow-hidden` + CSS-scaled container, so absolute positioning would
// clip the panel — fixed positioning relative to the viewport avoids that.
const panelPos = ref<{ top: number; right: number | null; left: number | null }>(
  { top: 0, right: 0, left: null },
);
/** True when the panel is centred, i.e. presenting as a modal — see below. */
const isSheet = ref(false);
const updatePanelPos = () => {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  // Flip above a trigger in the lower half of the viewport. The header bell
  // opens downward as always; the bottom nav's 공지사항 button sits at the very
  // bottom, where "below the trigger" is off-screen entirely. `max-h-96` on the
  // scroller plus the header/footer chrome bound the panel at ~460px, so that
  // is the height reserved when flipping — the panel is anchored by its top
  // either way, so this is a position, not a measurement.
  const PANEL_MAX_H = 460;
  const openUpward = rect.top > window.innerHeight / 2;
  const top = openUpward
    ? Math.max(8, rect.top - 8 - PANEL_MAX_H)
    : rect.bottom + 8;

  // Horizontal: hang the panel's RIGHT edge off the trigger's where there is
  // room for it — the header bell, on the right of a desktop viewport. Where
  // there is not, CENTRE it rather than shoving it against a gutter: the bottom
  // nav's 공지사항 button is the leftmost column, so anchoring put the panel off
  // the left edge entirely, and clamping it merely pinned it to the left. On a
  // tablet (iPad mini, 768px) that left a 450px panel sitting lopsided against
  // the edge; centred, it reads as the modal it is.
  //
  // Decided by whether the anchored position FITS, not by a breakpoint — an
  // earlier `innerWidth < 768` test put the iPad mini's exact 768 on the wrong
  // side of it. The width mirrors the element's own classes:
  // `w-[calc(100vw-2rem)]` below `md`, `md:w-[450px]` from there — keep in step.
  const GUTTER = 16;
  const vw = window.innerWidth;
  const panelWidth = Math.min(450, vw - GUTTER * 2);
  const anchoredLeft = rect.right - panelWidth;
  const maxLeft = vw - panelWidth - GUTTER;
  const fitsAnchored = anchoredLeft >= GUTTER && anchoredLeft <= maxLeft;
  const left = fitsAnchored
    ? anchoredLeft
    : Math.round((vw - panelWidth) / 2);
  // Centred means it is acting as a modal (small screens, or a trigger with no
  // room beside it) — that is the case that gets a backdrop. Anchored to its
  // trigger it is a dropdown, and a dropdown dimming the whole desktop page
  // would be wrong.
  isSheet.value = !fitsAnchored;
  panelPos.value = { top, right: null, left };
};

const filteredNotifications = computed(() => props.notifications);

const getIcon = (category: string): string => {
  const icons: Record<string, string> = {
    transaction: "💰",
    promo: "🎁",
    info: "ℹ️",
  };
  return icons[category] || "🔔";
};

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : text.substring(0, max) + "...";

const formatNotificationDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const groupedNotifications = computed(() => {
  return filteredNotifications.value.reduce(
    (groups, notification) => {
      const dateKey = formatNotificationDate(notification.created_at);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(notification);
      return groups;
    },
    {} as Record<string, Notification[]>,
  );
});

const toggleDropdown = () => {
  if (!isOpen.value) updatePanelPos();
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    handleMarkAllAsRead();
  }
};

const handleMarkAllAsRead = async () => {
  if (isMarkingAllRead.value || props.notifications.every((n) => n.is_read))
    return;
  isMarkingAllRead.value = true;
  try {
    await markNotificationsRead();
  } catch (error) {
    console.error("Failed to mark all as read:", error);
  } finally {
    isMarkingAllRead.value = false;
  }
};

// Close on outside click. Match via data-attribute so clicks on the
// teleported panel (which is outside dropdownRef in the DOM) still count
// as "inside" and don't close the dropdown.
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element | null;
  if (!target?.closest("[data-notification-dropdown]")) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.notification-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.notification-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 10px;
}
.notification-scrollbar::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--tm-accent) 70%, transparent);
  border-radius: 10px;
}
.notification-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--tm-accent);
}
</style>
