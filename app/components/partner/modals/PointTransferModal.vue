<template>
  <PartnerModal :model-value="modelValue" :title="t('partnerPages.modals.pointTransfer')" width="sm"
    @update:model-value="$emit('update:modelValue', $event)">
    <form class="flex flex-col gap-3.5" @submit.prevent="onSubmit">
      <!-- My point balance -->
      <FieldRow :label="t('partnerPages.modals.point')" :value="fmt(me.point)" />
      <!-- Receiver -->
      <FieldRow :label="t('partnerPages.modals.receiver')" :value="receiver.username" />

      <!-- Amount -->
      <div>
        <label class="pm-label">{{ t('partnerPages.modals.amount') }}</label>
        <div class="flex items-center gap-2">
          <input v-model.number="amount" type="number" min="0" inputmode="numeric"
            class="pm-input text-right flex-1 min-w-0" placeholder="0">
          <button type="button" class="amount-reset shrink-0" @click="amount = 0">{{ t('deposit.reset') }}</button>
        </div>
        <div class="grid grid-cols-3 gap-1.5 mt-2">
          <button v-for="q in quickAmounts" :key="q.v" type="button" class="quick-btn" @click="amount += q.v">{{ q.label }}</button>
        </div>
      </div>

      <button type="submit" class="pm-submit mt-2" :style="{ background: activeGradient, color: activeText }">
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
  receiver: { id: string; username: string };
  type: "ADD" | "DEDUCT";
}>();
const emit = defineEmits<{ "update:modelValue": [boolean]; submit: [{ amount: number; type: string; receiverId: string }] }>();

const { t } = useI18n();
const { activeGradient, activeText } = usePartnerTheme();
const currency = useCurrency();
const authStore = useAuthStore();

const me = computed(() => ({ point: Number(authStore.user.point_wallet) || 0 }));

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

watch(() => props.modelValue, (open) => { if (open) amount.value = 0; });

const onSubmit = () => {
  if (amount.value <= 0) return;
  emit("submit", { amount: amount.value, type: props.type, receiverId: props.receiver.id });
  emit("update:modelValue", false);
};
</script>
