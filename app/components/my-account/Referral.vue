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
      <AppTable :columns="columns" :rows="referrals" :empty-text="'—'">
        <template #row="{ row, index }">
          <td>{{ index + 1 }}</td>
          <td>{{ row.username }}</td>
          <td><TableDateCell :value="String(row.created_at ?? '')" /></td>
        </template>
      </AppTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { showAutoAlert } from "~~/utils/swal-alert";

const { t } = useI18n();
const authStore = useAuthStore();

const recordsStore = useMemberRecordsStore();
const referrals = computed(() => recordsStore.referrals.data ?? []);
const loading = computed(() => recordsStore.referrals.status === "idle" || recordsStore.referrals.status === "loading");

/** Header labels, in column order — the `row` slot emits cells to match. */
const columns = computed(() => [
  t("myAccount.referral.no"),
  t("myAccount.referral.user"),
  t("myAccount.referral.date"),
]);

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

onMounted(() => recordsStore.loadReferrals());
</script>
