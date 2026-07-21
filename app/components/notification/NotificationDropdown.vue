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
          class="fixed bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-[#D4AF37]/40 rounded-xl shadow-2xl p-0 overflow-hidden w-[calc(100vw-2rem)] md:w-[450px] md:min-w-[450px] z-[9999]"
          :style="{
            top: panelPos.top + 'px',
            right: panelPos.right + 'px',
            boxShadow:
              '0 0 30px rgba(212, 175, 55, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)',
          }"
        >
        <!-- Header -->
        <div class="relative p-3 border-b border-[#D4AF37]/30 bg-[#262626]/50">
          <div class="flex items-center justify-between">
            <h3 class="text-white text-lg font-bold flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
              {{ t("notifications.title") }}
            </h3>
            <div
              class="text-xs text-[#bcb8d6] bg-[#1a1a1a] border border-[#D4AF37]/20 px-2 py-1 rounded-full"
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
        <div class="max-h-96 overflow-y-auto notification-scrollbar">
          <div
            v-if="filteredNotifications.length === 0"
            class="text-center py-16"
          >
            <p class="text-[#bcb8d6] text-sm font-medium mb-2">
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
                  class="flex-1 h-px bg-gradient-to-r from-[#D4AF37]/50 to-transparent"
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
                          class="text-white font-semibold text-sm group-hover:text-[#D4AF37] transition-colors duration-200"
                        >
                          {{ truncate(notification.title, 50) }}
                        </h4>
                        <span
                          v-if="!notification.is_read"
                          class="bg-gradient-to-r from-[#D4AF37] to-[#C9A500] text-black text-xs px-2 py-0.5 rounded-full font-medium shadow-md shadow-[#D4AF37]/20"
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
  background: #1a1a1a;
  border-radius: 10px;
}
.notification-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #d4af37, #c9a500);
  border-radius: 10px;
}
.notification-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, #c9a500, #8b7500);
}
</style>
