<template>
  <div ref="dropdownRef" class="relative" data-notification-dropdown>
    <!-- Trigger slot -->
    <div ref="triggerRef" @click="toggleDropdown">
      <slot />
    </div>

    <!-- Dropdown content. Teleported to body so it escapes any
         overflow-hidden / scaled ancestor (notably the mobile header
         container). Position is computed from the trigger's
         getBoundingClientRect() when the dropdown opens. -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          data-notification-dropdown
          class="tm-modal modal-body-fill fixed border border-[var(--tm-accent)]/40 rounded-xl shadow-2xl p-0 overflow-hidden w-[calc(100vw-2rem)] md:w-[450px] md:min-w-[450px] z-[9999]"
          :style="[modalTheme, {
            top: panelPos.top + 'px',
            right: panelPos.right + 'px',
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useApi } from "@/composables/useApi";

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
}

const props = withDefaults(defineProps<Props>(), {
  notifications: () => [],
});
const emit = defineEmits<{
  markedAllRead: [];
}>();

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
const panelPos = ref({ top: 0, right: 0 });
const updatePanelPos = () => {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  panelPos.value = {
    top: rect.bottom + 8,
    right: window.innerWidth - rect.right,
  };
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
    const api = useApi();
    await api("/notifications/read-all", { method: "PATCH" });
    emit("markedAllRead");
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
