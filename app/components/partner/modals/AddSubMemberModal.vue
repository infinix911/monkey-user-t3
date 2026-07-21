<template>
  <PartnerModal :model-value="modelValue" :title="t('partnerPages.modals.addSubMember')" width="lg"
    @update:model-value="$emit('update:modelValue', $event)">
    <form class="flex flex-col gap-6" @submit.prevent="onSubmit">
      <!-- Basic info -->
      <section>
        <h4 class="pm-section-title">{{ t('partnerPages.modals.basicInfo') }}</h4>

        <!-- Type radio -->
        <div class="mb-4">
          <label class="pm-label">{{ t('partnerPages.modals.type') }}</label>
          <div class="flex gap-4">
            <label v-for="opt in typeOptions" :key="String(opt.value)"
              class="flex items-center gap-2 cursor-pointer text-white/85 text-[13px] font-semibold">
              <input v-model="form.isShop" type="radio" :value="opt.value" class="accent-current"
                :style="{ accentColor: accent }">
              {{ opt.label }}
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <TextField v-model="form.username" :label="t('partnerPages.modals.id')" />
          <TextField v-model="form.nickname" :label="t('partnerPages.modals.nickname')" />
          <TextField v-model="form.password" :label="t('partnerPages.modals.password')" type="password" />

          <TextField v-model="form.mobile" :label="t('partnerPages.modals.phone')" />
          <div>
            <label class="pm-label">{{ t('partnerPages.modals.bankName') }}</label>
            <select v-model="form.bankName" class="pm-input">
              <option v-for="b in banks" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <TextField v-model="form.bankAccountName" :label="t('partnerPages.modals.bankAccountName')" />
          <TextField v-model="form.bankAccount" :label="t('partnerPages.modals.bankAccount')" type="text" />
        </div>
      </section>

      <!-- Commission settings -->
      <section>
        <h4 class="pm-section-title">{{ t('partnerPages.modals.commissionSettings') }}</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <TextField v-model="form.pctRollCasino" :label="t('partnerPages.modals.casinoRolling')" type="number" />
          <TextField v-model="form.pctRollSlot" :label="t('partnerPages.modals.slotRolling')" type="number" />
          <TextField v-model="form.pctRollSport" label="Sport rolling" type="number" />
          <TextField v-model="form.pctRollMini" label="Mini rolling" type="number" />
        </div>
      </section>

      <button type="submit" class="pm-submit" :style="{ background: activeGradient, color: activeText }">
        {{ t('partnerPages.modals.addSubMember') }}
      </button>
    </form>
  </PartnerModal>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from "vue";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [boolean]; submit: [Record<string, unknown>] }>();

const { t } = useI18n();
const { accent, activeGradient, activeText } = usePartnerTheme();

const typeOptions = computed(() => [
  { value: false, label: t("partnerPages.modals.normalMember") },
  { value: true, label: t("partnerPages.modals.shopMember") },
]);

// The API has no bank directory endpoint, so this remains a local input list.
const banks = ["KB국민은행", "신한은행", "우리은행", "하나은행", "농협은행", "카카오뱅크", "토스뱅크"];

const blank = () => ({
  isShop: false,
  username: "",
  nickname: "",
  password: "",
  mobile: "",
  bankName: banks[0],
  bankAccountName: "",
  bankAccount: "",
  pctRollCasino: 0,
  pctRollSlot: 0,
  pctRollSport: 0,
  pctRollMini: 0,
});
const form = reactive(blank());

watch(() => props.modelValue, (open) => { if (open) Object.assign(form, blank()); });

const onSubmit = () => {
  const upperId = useAuthStore().user.id;
  if (!upperId) return;
  emit("submit", { upperId, ...form });
};
</script>

<style scoped>
.pm-section-title {
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
