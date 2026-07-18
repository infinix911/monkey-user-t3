<template>
  <PartnerModal :model-value="modelValue" :title="t('partnerPages.col.slotMoney')" width="sm"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3.5">
      <FieldRow :label="t('partnerPages.modals.member')" :value="String(member?.member ?? '—')" />
      <FieldRow :label="t('partnerPages.col.slotMoney')" :value="fmt(balance)" />

      <p class="text-white/45 text-xs leading-relaxed">{{ t('partnerPages.modals.slotMoneyHint') }}</p>

      <button type="button" class="pm-submit mt-1" :class="balance <= 0 ? 'is-disabled' : ''"
        :style="{ background: activeGradient, color: activeText }" :disabled="balance <= 0" @click="onConfirm">
        {{ t('partnerPages.modals.slotWithdraw') }}
      </button>
    </div>
  </PartnerModal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCurrency } from "@/composables/useCurrency";

const props = defineProps<{
  modelValue: boolean;
  /** The member row (carries a `slotBalance`). */
  member: Record<string, unknown> | null;
}>();
const emit = defineEmits<{ "update:modelValue": [boolean]; confirm: [Record<string, unknown>] }>();

const { t } = useI18n();
const { activeGradient, activeText } = usePartnerTheme();
const currency = useCurrency();

const balance = computed(() => Number(props.member?.slotBalance) || 0);
const fmt = (v: number) => currency.formatNumber(v);

const onConfirm = () => {
  if (!props.member || balance.value <= 0) return;
  // Dummy — the game-wallet withdrawal API is wired later.
  emit("confirm", props.member);
  emit("update:modelValue", false);
};
</script>

<style scoped>
.pm-submit.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
