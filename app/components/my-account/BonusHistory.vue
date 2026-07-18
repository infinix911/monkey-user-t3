<template>
  <div class="h-full p-0 overflow-y-auto pt-5">
    <!-- Loading State -->
    <div v-if="loading">
      <div class="mb-6">
        <h3 class="text-white text-lg font-bold mb-3 text-start" style="font-family: var(--font-line-seed)">
          {{ t("myAccount.bonusHistory.title") }}
        </h3>
      </div>
      <div class="flex items-center justify-center py-8">
        <span class="text-white">{{
          t("myAccount.bonusHistory.loading")
        }}</span>
      </div>
    </div>

    <!-- Loaded State -->
    <template v-else>
      <!-- Total Bonus -->
      <div class="">
        <h3 class="text-white text-lg font-bold mb-3 text-start" style="font-family: var(--font-line-seed)">
          {{ t("myAccount.bonusHistory.totalBonus") }}: {{ totalBonus }}
        </h3>
      </div>

      <!-- Data Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr style="background-color: #161616">
              <th
                class="px-3 py-2 text-center text-white font-semibold text-sm"
                style="font-family: var(--font-line-seed)">
                {{ t("myAccount.bonusHistory.no") }}
              </th>
              <th
                class="px-3 py-2 text-center text-white font-semibold text-sm"
                style="font-family: var(--font-line-seed)">
                {{ t("myAccount.bonusHistory.promotions") }}
              </th>
              <th
                class="px-3 py-2 text-center text-white font-semibold text-sm"
                style="font-family: var(--font-line-seed)">
                {{ t("myAccount.bonusHistory.amount") }}
              </th>
              <th
                class="px-3 py-2 text-center text-white font-semibold text-sm"
                style="font-family: var(--font-line-seed)">
                {{ t("myAccount.bonusHistory.date") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="bonuses.length === 0">
              <td colspan="4" class="px-2 py-8 text-center" style="background-color: #505050">
                <span class="text-gray-400" style="font-family: var(--font-line-seed)">—</span>
              </td>
            </tr>
            <tr
              v-for="(bonus, index) in bonuses" :key="index" class="border-b last:border-b-0"
              style="background-color: #505050; border-color: #7a7a7a">
              <td class="px-3 py-1.5 text-center text-[#e2e2e2] text-sm" style="font-family: var(--font-line-seed)">
                {{ index + 1 }}
              </td>
              <td class="px-3 py-1.5 text-center text-[#e2e2e2] text-sm" style="font-family: var(--font-line-seed)">
                {{ bonus.promotions }}
              </td>
              <td class="px-3 py-1.5 text-center text-[#e2e2e2] text-sm" style="font-family: var(--font-line-seed)">
                {{ bonus.amount }}
              </td>
              <td class="px-3 py-1.5 text-center text-[#e2e2e2] text-sm" style="font-family: var(--font-line-seed)">
                {{ bonus.used_at }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useApi } from "@/composables/useApi";

interface IBonusRedemption {
  promotions: string;
  amount: string;
  used_at: string;
}

const { t } = useI18n();

const bonuses = ref<IBonusRedemption[]>([]);
const loading = ref(true);

const totalBonus = computed(() => {
  return bonuses.value.reduce(
    (sum, bonus) => sum + parseFloat(bonus.amount || "0"),
    0,
  );
});

onMounted(async () => {
  try {
    const api = useApi();
    bonuses.value = (await api<IBonusRedemption[]>("/promotions/bonuses")) || [];
  } catch (err) {
    console.error("Failed to fetch bonuses:", err);
  } finally {
    loading.value = false;
  }
});
</script>
