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
      <div class="h-full overflow-y-auto">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr style="background-color: #161616">
                <th
                  class="px-3 py-2 text-center text-white font-semibold text-sm"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ t("myAccount.loginHistory.date") }}
                </th>
                <th
                  class="px-3 py-2 text-center text-white font-semibold text-sm"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ t("myAccount.loginHistory.ip") }}
                </th>
                <th
                  class="px-3 py-2 text-center text-white font-semibold text-sm"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ t("myAccount.loginHistory.device") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loginHistories.length === 0">
                <td
                  colspan="3"
                  class="px-2 py-8 text-center"
                  style="background-color: #505050"
                >
                  <span
                    class="text-gray-400"
                    style="font-family: var(--font-line-seed)"
                    >—</span
                  >
                </td>
              </tr>
              <tr
                v-for="(log, index) in loginHistories"
                :key="log.id || index"
                class="border-b last:border-b-0"
                style="background-color: #505050; border-color: #7a7a7a"
              >
                <td
                  class="px-3 py-1.5 text-center text-[#e2e2e2] text-sm"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ log.created_at }}
                </td>
                <td
                  class="px-3 py-1.5 text-center text-[#e2e2e2] text-sm"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ log.ip_address }}
                </td>
                <td
                  class="px-3 py-1.5 text-center text-[#e2e2e2] text-sm"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ formatDeviceInfo(log.user_agent) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useApi } from "@/composables/useApi";
import { formatDeviceInfo } from "~/lib/user-agent";

interface ILoginLog {
  id: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const { t } = useI18n();

const loginHistories = ref<ILoginLog[]>([]);
const loading = ref(true);

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

onMounted(async () => {
  try {
    const { start_date, end_date } = calculateDateRange();
    const api = useApi();
    loginHistories.value =
      (await api<ILoginLog[]>(
        `/auth/login-histories?start_date=${start_date}&end_date=${end_date}`,
      )) || [];
  } catch (err) {
    console.error("Failed to fetch login history:", err);
  } finally {
    loading.value = false;
  }
});
</script>
