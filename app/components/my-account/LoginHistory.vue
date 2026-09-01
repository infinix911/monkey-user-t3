<template>
  <div class="h-full pb-4">
    <!-- Loading State -->
    <div v-if="loading">
      <div class="mb-6">
        <h3
          class="text-white text-lg font-bold mb-3 text-start"
          style="font-family: var(--font-line-seed)"
        >
          {{ t("myAccount.loginHistory.title") }}
        </h3>
      </div>
      <div class="flex items-center justify-center py-8">
        <span class="text-white">{{ t("common.loading") }}</span>
      </div>
    </div>

    <!-- Loaded State -->
    <template v-else>
      <div class="">
        <h3 class="text-white text-lg font-bold mb-3 text-start font-medium">
          {{ t("myAccount.loginHistory.title") }}
        </h3>
      </div>
      <AppTable :columns="columns" :rows="loginHistories as unknown as Record<string, unknown>[]" :empty-text="'—'">
        <template #row="{ row }">
          <td><TableDateCell :value="String(row.created_at ?? '')" /></td>
          <td>
            <a
              v-if="cleanIp(row.ip_address as string)"
              :href="`https://whatismyipaddress.com/ip/${cleanIp(row.ip_address as string)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="tm-accent-text underline underline-offset-2 hover:brightness-125 transition"
            >
              {{ cleanIp(row.ip_address as string) }}
            </a>
            <span v-else>{{ row.ip_address || "—" }}</span>
          </td>
          <td>{{ formatDeviceInfo(row.user_agent as string) }}</td>
        </template>
      </AppTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { formatDeviceInfo } from "~/lib/user-agent";

const { t } = useI18n();

const recordsStore = useMemberRecordsStore();
const dateRange = calculateDateRange();
const loginKey = `login:endDate=${encodeURIComponent(dateRange.end_date)}&startDate=${encodeURIComponent(dateRange.start_date)}`;
const loginEntry = computed(() => recordsStore.loginHistories[loginKey]);
const loginHistories = computed(() => loginEntry.value?.data ?? []);
const loading = computed(() => !loginEntry.value || loginEntry.value.status === "loading");

/** Header labels, in column order — the `row` slot emits cells to match. */
const columns = computed(() => [
  t("myAccount.loginHistory.date"),
  t("myAccount.loginHistory.ip"),
  t("myAccount.loginHistory.device"),
]);

/**
 * The bare address from a stored `ip_address`.
 *
 * The column is a PostgreSQL `inet`, so a single host comes back carrying its
 * prefix — `1.2.3.4/32` for IPv4, `/128` for IPv6. That suffix is noise to a
 * reader and breaks the lookup URL, so it is stripped. Only a full-host prefix
 * is dropped: a genuine network range keeps its mask and is shown as plain text
 * rather than linked, since the lookup takes a single address.
 *
 * @param raw - Value as stored, possibly null.
 * @returns {string} A bare address, or "" when there is nothing linkable.
 */
function cleanIp(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const [address, prefix] = value.split("/");
  if (!prefix) return address ?? "";
  const isFullHost =
    (address?.includes(":") && prefix === "128") ||
    (!address?.includes(":") && prefix === "32");
  return isFullHost ? (address ?? "") : "";
}

function calculateDateRange() {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  return { start_date: formatDate(sevenDaysAgo), end_date: formatDate(today) };
}

onMounted(() => recordsStore.loadLoginHistories({ startDate: dateRange.start_date, endDate: dateRange.end_date }));
</script>
