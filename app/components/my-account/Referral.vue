<template>
  <div class="h-full p-0 overflow-y-auto mt-1">
    <!-- Loading State -->
    <div v-if="loading">
      <div class="mb-6">
        <h3
          class="text-white text-lg font-bold mb-3 text-start uppercase"
          style="font-family: var(--font-line-seed)"
        >
          {{ t("myAccount.referral.title") }}
        </h3>
      </div>
      <div class="flex items-center justify-center py-8">
        <span class="text-white">{{ t("common.loading") }}</span>
      </div>
    </div>

    <!-- Loaded State -->
    <template v-else>
      <!-- Link Section -->
      <div class="mb-4 mt-2">
        <h3
          class="text-white text-lg font-bold mb-3 text-start uppercase font-medium"
        >
          {{ t("myAccount.referral.linkTitle") }}
        </h3>
        <div class="flex rounded-[4px] overflow-hidden">
          <input
            type="text"
            :value="referralLink"
            readonly
            class="tm-field flex-1 px-4 py-2 rounded-none outline-none"
            style="font-family: var(--font-line-seed)"
          >
          <button
            class="tm-btn px-6 py-2 transition-colors font-semibold uppercase cursor-pointer"
            style="font-family: var(--font-line-seed)"
            @click="handleCopy"
          >
            {{ t("myAccount.referral.copy") }}
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="tm-thead">
              <th
                class="px-3 py-2 text-center text-white font-semibold text-sm"
                style="font-family: var(--font-line-seed)"
              >
                {{ t("myAccount.referral.no") }}
              </th>
              <th
                class="px-3 py-2 text-center text-white font-semibold text-sm"
                style="font-family: var(--font-line-seed)"
              >
                {{ t("myAccount.referral.user") }}
              </th>
              <th
                class="px-3 py-2 text-center text-white font-semibold text-sm"
                style="font-family: var(--font-line-seed)"
              >
                {{ t("myAccount.referral.date") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="referrals.length === 0">
              <td
                colspan="3"
                class="tm-row px-2 py-8 text-center"
              >
                <span
                  class="tm-muted"
                  style="font-family: var(--font-line-seed)"
                  >—</span
                >
              </td>
            </tr>
            <tr
              v-for="(referral, index) in referrals"
              :key="index"
              class="tm-row tm-line border-b last:border-b-0"
            >
              <td
                class="px-3 py-1.5 text-center text-white/85 text-sm"
                style="font-family: var(--font-line-seed)"
              >
                {{ index + 1 }}
              </td>
              <td
                class="px-3 py-1.5 text-center text-white/85 text-sm"
                style="font-family: var(--font-line-seed)"
              >
                {{ referral.username }}
              </td>
              <td
                class="px-3 py-1.5 text-center text-white/85 text-sm"
                style="font-family: var(--font-line-seed)"
              >
                {{ referral.created_at }}
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
import { showAutoAlert } from "~~/utils/swal-alert";
import { validateResponse } from "@/lib/validateResponse";
import {
  referralsResponseSchema,
  mapReferral,
  type Referral as IReferral,
} from "@/interfaces/auth.interface";

const { t } = useI18n();
const authStore = useAuthStore();

const referrals = ref<IReferral[]>([]);
const loading = ref(true);

const referralLink = computed(() => {
  if (typeof window !== "undefined" && authStore.user.username) {
    return `${window.location.origin}?referral=${authStore.user.username}`;
  }
  return "";
});

function handleCopy() {
  if (referralLink.value) {
    navigator.clipboard.writeText(referralLink.value);
    showAutoAlert(t("myAccount.referral.copySuccess"));
  }
}

onMounted(async () => {
  try {
    const api = useApi();
    const raw = await api("/auth/referrals");
    referrals.value = validateResponse(
      referralsResponseSchema,
      raw,
      "/auth/referrals",
    ).map(mapReferral);
  } catch (err) {
    console.error("Failed to fetch referrals:", err);
  } finally {
    loading.value = false;
  }
});
</script>
