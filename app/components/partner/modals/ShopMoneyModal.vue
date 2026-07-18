<template>
  <PartnerModal :model-value="modelValue" :title="title" width="sm"
    @update:model-value="$emit('update:modelValue', $event)">
    <form class="flex flex-col gap-3.5" @submit.prevent="onSubmit">
      <!-- Partner (me) -->
      <FieldRow :label="t('partnerPages.modals.member')" :value="me.username" />
      <!-- Store member (receiver) -->
      <FieldRow :label="t('partnerPages.modals.storeMember')" :value="receiver.username" />
      <!-- Relevant balance -->
      <FieldRow :label="t('partnerPages.modals.shopBalance')"
        :value="fmt(type === 'ADD' ? me.wallet : receiver.wallet)" />
      <!-- Transaction type -->
      <FieldRow :label="t('partnerPages.modals.transaction')"
        :value="type === 'ADD' ? t('partnerPages.modals.add') : t('partnerPages.modals.subtract')" />

      <!-- Amount -->
      <div>
        <label class="block text-white/55 text-[11px] font-bold uppercase tracking-wider mb-1.5">
          {{ t('partnerPages.modals.amount') }}
        </label>
        <div class="flex items-center gap-2">
          <input v-model.number="amount" type="number" min="0" inputmode="numeric"
            class="pm-input text-right flex-1 min-w-0" :placeholder="'0'">
          <button type="button" class="amount-reset shrink-0" @click="amount = 0">
            {{ t('deposit.reset') }}
          </button>
        </div>
        <div class="grid grid-cols-3 gap-1.5 mt-2">
          <button v-for="q in quickAmounts" :key="q.v" type="button" class="quick-btn"
            @click="amount += q.v">{{ q.label }}</button>
        </div>
      </div>

      <!-- Submit -->
      <button type="submit" class="pm-submit mt-2"
        :style="{ background: activeGradient, color: activeText }">
        {{ type === 'ADD' ? t('partnerPages.modals.add') : t('partnerPages.modals.subtract') }}
      </button>
    </form>
  </PartnerModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useCurrency } from "@/composables/useCurrency";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{
  modelValue: boolean;
  /** Receiver (shop member) — id, username, wallet balance. */
  receiver: { id: string; username: string; wallet: number };
  /** ADD = partner → member, DEDUCT = member → partner. */
  type: "ADD" | "DEDUCT";
}>();
const emit = defineEmits<{ "update:modelValue": [boolean]; submit: [{ amount: number; type: string; receiverId: string }] }>();

const { t } = useI18n();
const { activeGradient, activeText } = usePartnerTheme();
const currency = useCurrency();
const authStore = useAuthStore();

const me = computed(() => ({
  username: authStore.user.username || "—",
  wallet: Number(authStore.user.wallet) || 0,
}));

const title = computed(() =>
  props.type === "ADD" ? t("partnerPages.modals.shopAdd") : t("partnerPages.modals.shopDeduct"),
);

const amount = ref(0);
// Same quick-amount set as the deposit modal (see useBankPayment QUICK_AMOUNTS).
const quickAmounts = [
  { v: 5_000, label: "5K" },
  { v: 50_000, label: "50K" },
  { v: 100_000, label: "100K" },
  { v: 250_000, label: "250K" },
  { v: 500_000, label: "500K" },
  { v: 1_000_000, label: "1M" },
];

const fmt = (v: number) => currency.formatNumber(Number(v) || 0);

// Reset the amount whenever the modal (re)opens.
watch(() => props.modelValue, (open) => { if (open) amount.value = 0; });

const onSubmit = () => {
  if (amount.value <= 0) return;
  // Dummy — API wired later.
  emit("submit", { amount: amount.value, type: props.type, receiverId: props.receiver.id });
  emit("update:modelValue", false);
};
</script>
