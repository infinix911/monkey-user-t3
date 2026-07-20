<template>
  <div
    class="flex w-full justify-center overflow-hidden font-medium lg:rounded-[18px] border-2 border-[#454545]"
    style="background: linear-gradient(0deg, #131313 0%, #5b5b5b 100%)"
  >
    <div class="w-full px-4 lg:pl-10 lg:pr-10">
      <div>
        <form @submit.prevent="onSubmit">
          <div class="mt-2 md:mt-6 pl-3 lg:pl-auto pr-3 md:pr-0">
            <div class="w-full mx-auto mt-4">
              <!-- Title -->
              <div class="mb-6">
                <h2
                  class="text-white text-[18px] lg:text-[22px] font-bold"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ t("partner.partnerDeposit") }}
                </h2>
                <p class="text-[#AFAFAF] text-[14px] mt-2">
                  {{ t("partner.partnerDepositDesc") }}
                </p>
              </div>

              <!-- Divider -->
              <div class="w-full mb-6" style="height: 1px; background: #666" />

              <!-- Current Balance -->
              <div class="mb-6">
                <label
                  class="text-white text-[14.5px] lg:text-[17px] mb-2 block font-medium"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ t("withdrawal.currentBalance") }}
                </label>
                <input
                  type="text"
                  :value="formatCurrency(user.wallet || '0')"
                  readonly
                  class="bg-white text-[#212121] px-4 py-3 lg:py-2 rounded w-full text-base lg:text-[20px] h-[53px]"
                  style="box-shadow: 0 4px 4px 0 rgba(0,0,0,0.5); border-radius: 3.417px; font-family: var(--font-line-seed)"
                >
              </div>

              <!-- Deposit Amount -->
              <div class="mb-5">
                <label
                  class="text-white text-[14.5px] lg:text-[17px] mb-2 block font-medium"
                  style="font-family: var(--font-line-seed)"
                >
                  {{ t("deposit.depositAmount") }}
                </label>
                <input
                  type="text"
                  :value="amountDisplay"
                  maxlength="15"
                  class="bg-white text-[#212121] px-4 py-3 lg:py-2 rounded w-full mb-3 text-base lg:text-[20px] h-[53px]"
                  style="box-shadow: 0 4px 4px 0 rgba(0,0,0,0.5); border-radius: 3.417px; font-family: var(--font-line-seed)"
                  @input="(e: Event) => { lastSelectedButton = null; handleAmountChange((e.target as HTMLInputElement).value); }"
                >
                <p v-if="errors.amount" class="text-xs text-red-500 mb-2">
                  {{ errors.amount }}
                </p>

                <div class="grid grid-cols-4 gap-2 lg:gap-3 mt-6">
                  <div v-for="qa in quickAmounts" :key="qa.label" class="relative">
                    <div class="shadow-3d h-[45px] md:h-[50px]" />
                    <button
                      type="button"
                      class="h-[45px] md:h-[50px] text-[18px] md:text-[20px] relative text-black transition-all text-center z-10 hover:scale-105 active:scale-95 font-medium"
                      :class="{ 'ring-2 ring-[#ffe100]': lastSelectedButton === qa.label }"
                      :style="{
                        backgroundColor: '#c9c9c9',
                        borderRadius: '12px',
                        fontWeight: 600,
                        border: lastSelectedButton === qa.label ? '1px solid #ffe100' : '1.7px solid #3C3C3C',
                        width: '100%',
                        color: '#000',
                        textAlign: 'center',
                        fontFamily: 'var(--font-line-seed)',
                      }"
                      @click="handleAmountClick(qa)"
                      @mouseenter="($event.target as HTMLElement).style.backgroundColor = '#d4d4d4'"
                      @mouseleave="($event.target as HTMLElement).style.backgroundColor = '#c9c9c9'"
                    >
                      {{ qa.label }}
                    </button>
                  </div>

                  <!-- RESET Button -->
                  <div class="relative col-span-2">
                    <div class="shadow-3d h-[45px] md:h-[50px]" />
                    <button
                      type="button"
                      class="h-[45px] md:h-[50px] text-[18px] md:text-[20px] relative text-black transition-all text-center z-10 hover:scale-105 active:scale-95 font-medium"
                      :class="{ 'ring-2 ring-[#ffe100]': lastSelectedButton === 'RESET' }"
                      :style="{
                        backgroundColor: '#ff6b6b',
                        borderRadius: '12px',
                        fontWeight: 600,
                        border: lastSelectedButton === 'RESET' ? '1px solid #ffe100' : '1.7px solid #3C3C3C',
                        width: '100%',
                        color: '#000',
                        textAlign: 'center',
                        fontFamily: 'var(--font-line-seed)',
                      }"
                      @click="handleReset"
                      @mouseenter="($event.target as HTMLElement).style.backgroundColor = '#ff8080'"
                      @mouseleave="($event.target as HTMLElement).style.backgroundColor = '#ff6b6b'"
                    >
                      {{ t("withdrawal.reset") }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="relative mt-[40px] mb-[10px]">
                <div class="shadow-3d h-[50px] lg:h-[55px]" />
                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="text-[20px] lg:text-[24px] relative w-full bg-[#ffe100] hover:bg-[#e6cc00] disabled:bg-[#d1c25a] text-black font-bold py-4 transition-colors z-10 h-[50px] lg:h-[55px] flex items-center justify-center text-center"
                  style="border-radius: 12px; border: 1.7px solid #3C3C3C; font-family: var(--font-line-seed)"
                >
                  {{ isSubmitting ? t("deposit.submitting") : t("partner.requestDeposit") }}
                </button>
              </div>

              <!-- My Request History -->
              <div class="mb-15">
                <PartnerMyHistory ref="historyRef" type="deposit" />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "~/stores/auth";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";

const props = defineProps<{
  onSuccess?: () => void;
}>();

const { t } = useI18n();
const apiMessage = useApiMessage();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

const isSubmitting = ref(false);
const lastSelectedButton = ref<string | null>(null);
const amount = ref("0");
const submitted = ref(false);
const historyRef = ref<{ refresh: () => void } | null>(null);

const schema = toTypedSchema(
  z.object({
    amount: z
      .string()
      .refine((v) => /^\d+$/.test(v.replace(/,/g, "")), () => ({ message: t("deposit.depositCheck") }))
      .refine((v) => Number(v.replace(/,/g, "")) > 0, () => ({ message: t("deposit.depositCheck") }))
      .refine((v) => Number(v.replace(/,/g, "")) >= 10000, () => ({ message: t("deposit.depositCheck") }))
      .refine((v) => Number(v.replace(/,/g, "")) % 1000 === 0, () => ({ message: t("deposit.depositDivCheck") })),
  })
);

const {
  handleSubmit: veeHandleSubmit,
  errors: rawErrors,
  setFieldValue,
  resetForm: veeResetForm,
} = useForm({
  validationSchema: schema,
  initialValues: { amount: "0" },
});

const errors = computed(() => (submitted.value ? rawErrors.value : {}));

const amountDisplay = computed(() => {
  if (!amount.value || amount.value === "0") return "";
  return `฿ ${Number(amount.value).toLocaleString("th-TH")}`;
});

watch(amount, (val) => setFieldValue("amount", val, false));

const quickAmounts = [
  { value: 10000, label: "10K" },
  { value: 50000, label: "50K" },
  { value: 100000, label: "100K" },
  { value: 250000, label: "250K" },
  { value: 500000, label: "500K" },
  { value: 1000000, label: "1JT" },
];

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  return `฿ ${(isNaN(num) ? 0 : num).toLocaleString("th-TH")}`;
}

function handleAmountChange(value: string) {
  const cleanValue = value.replace(/[^0-9]/g, "");
  amount.value = cleanValue;
}

function handleAmountClick(qa: { value: number; label: string }) {
  const currentAmount = Number(amount.value) || 0;
  const newAmount = currentAmount + qa.value;
  lastSelectedButton.value = qa.label;
  amount.value = newAmount.toString();
}

function handleReset() {
  lastSelectedButton.value = "RESET";
  amount.value = "0";
}

const onSubmit = async () => {
  submitted.value = true;
  await veeSubmit();
};

const veeSubmit = veeHandleSubmit(async (values) => {
  isSubmitting.value = true;

  try {
    const amountDeposit = Number(values.amount.replace(/,/g, ""));
    const api = useApi();
    await api("/partner/deposit", {
      method: "POST",
      body: { amount: amountDeposit },
    });

    await showSuccessAlert(
      t("partner.partnerDeposit"),
      t("partner.apiMessages.PARTNER_DEPOSIT_REQUEST_SUCCESS")
    );

    amount.value = "0";
    lastSelectedButton.value = null;
    submitted.value = false;
    veeResetForm();
    historyRef.value?.refresh();
    props.onSuccess?.();
  } catch (error: unknown) {
    await showErrorAlert(
      t("partner.partnerDeposit"),
      apiMessage(error, "partner"),
    );
  } finally {
    isSubmitting.value = false;
  }
});
</script>

<style scoped>
.shadow-3d {
  position: absolute;
  bottom: -4px;
  left: 4px;
  right: 0;
  background: #3c3c3c;
  border-radius: 12px;
  z-index: 0;
}
</style>
