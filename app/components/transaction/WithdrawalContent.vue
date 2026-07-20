<template>
  <div class="w-full" :style="{ background: dep.modalBgColor, fontFamily: 'var(--font-line-seed)' }">
    <div class="w-full px-3 md:px-5 pt-5 pb-4 md:py-6 max-w-md mx-auto">
      <form @submit.prevent="onSubmit">
        <!-- Withdrawal Method / Account -->
        <label class="text-white text-sm mb-2 flex items-center gap-1.5">
          <span :style="{ color: dep.accentColor }">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </span>
          {{ t("withdrawal.selectMethod") }}
        </label>

        <!-- Bank Account Card (dark with accent glow border) -->
        <div v-if="bankName && bankAccountNumber" class="relative flex flex-col justify-between min-h-[140px] mb-6 p-4"
          :style="cardStyle">
          <!-- Bank name (no logo image — lead with an emoji, same as the deposit card) -->
          <p class="self-start flex items-center gap-2 text-white font-bold text-[15px] lg:text-[17px]">
            <span aria-hidden="true">🏦</span>
            <span>{{ user.bank_name || t("withdrawal.bankName") }}</span>
          </p>

          <div class="mt-auto pt-4">
            <p class="text-white text-[18px] lg:text-[20px] tracking-wide">
              {{
                user.bank_account
                  ? user.bank_account.match(/.{1,4}/g)?.join("-")
                  : ""
              }}
            </p>
            <p class="text-[14px] lg:text-[16px] text-white/60">
              {{ user.bank_account ? user.bank_account_name : "" }}
            </p>
          </div>
        </div>

        <!-- Current Balance -->
        <label class="text-white text-sm mb-2 flex items-center gap-1.5">
          <span :style="{ color: dep.accentColor }">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </span>
          {{ t("withdrawal.currentBalance") }}
        </label>
        <div class="relative mb-6">
          <input type="text" :value="formatCurrency(user.wallet || '0')" readonly
            class="px-4 py-3 rounded w-full text-base lg:text-[20px] h-[53px] font-bold" :style="{
              backgroundColor: dep.inputBgColor,
              color: dep.accentColor,
              border: `1px solid ${dep.inputBorderColor}`,
              borderRadius: '4px',
            }">
          <button type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-transform hover:rotate-90 cursor-pointer"
            :style="{ color: dep.accentColor }" :aria-label="t('withdrawal.currentBalance')" @click="refreshBalance">
            <svg class="w-5 h-5" :class="{ 'animate-spin': isRefreshing }" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        <!-- Withdrawal Amount -->
        <label class="text-white text-sm mb-2 flex items-center gap-1.5">
          <span :style="{ color: dep.accentColor }">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5.5" />
            </svg>
          </span>
          {{ t("withdrawal.withdrawalAmount") }}
        </label>
        <input type="text" :value="amountDisplay" :placeholder="`${currency.symbol} 0`" maxlength="15"
          class="px-4 py-3 rounded w-full text-base lg:text-[20px] h-[53px]" :style="{
            backgroundColor: dep.inputBgColor,
            color: dep.inputTextColor,
            border: `1px solid ${dep.inputBorderColor}`,
            borderRadius: '4px',
          }" @input="
            (e: Event) => {
              lastSelectedButton = null;
              handleAmountChange((e.target as HTMLInputElement).value);
            }
          ">
        <p v-if="errors.amount" class="text-xs text-red-500 mt-1">
          {{ errors.amount }}
        </p>

        <div class="grid grid-cols-4 gap-2 mt-4">
          <!-- Quick amount chips -->
          <button v-for="qa in quickAmounts" :key="qa.label" type="button" class="amt-btn text-[15px] md:text-[17px]"
            :class="{ 'is-selected': lastSelectedButton === qa.label }" :style="{
              '--amt-bg': dep.quickAmountBgColor,
              '--amt-text': dep.quickAmountTextColor,
              '--amt-accent': dep.accentColor,
            }" @click="handleAmountClick(qa)">
            {{ qa.label }}
          </button>

          <!-- MAX (violet) -->
          <button type="button" class="amt-btn amt-max text-[15px] md:text-[17px]" @click="handleMax">
            {{ t("withdrawal.max") }}
          </button>

          <!-- RESET (red) -->
          <button type="button" class="amt-btn amt-reset text-[15px] md:text-[16px]" @click="handleReset">
            {{ t("withdrawal.reset") }}
          </button>
        </div>

        <!-- Withdrawal Button -->
        <div class="relative mt-6 mb-4">
          <button type="submit" :disabled="isSubmitting"
            class="deposit-primary-btn text-[20px] lg:text-[24px] relative w-full font-bold transition-colors z-10 h-[50px] lg:h-[55px] flex items-center justify-center gap-2 text-center disabled:opacity-60 disabled:cursor-not-allowed"
            :style="{
              '--btn-grad': dep.buttonGradientColor,
              '--btn-grad-hover': dep.buttonGradientHoverColor,
              '--btn-text': dep.buttonTextColor,
              borderRadius: '12px',
              border: '1.7px solid #3c3c3c',
            }">
            <svg v-if="!isSubmitting" class="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {{
              isSubmitting
                ? t("withdrawal.submitting")
                : t("withdrawal.withdraw")
            }}
          </button>
        </div>

        <!-- Confirmation info box (accent-tinted) -->
        <div class="wd-info flex items-center gap-2.5 px-3 py-3 mb-2" :style="{ '--wd-accent': dep.accentColor }">
          <span class="shrink-0" :style="{ color: dep.accentColor }">
            <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </span>
          <div class="flex flex-col leading-snug">
            <span class="text-xs md:text-sm text-white">{{ t("withdrawal.confirmLine1") }}</span>
            <span class="text-xs md:text-sm" :style="{ color: dep.accentColor }">{{ t("withdrawal.confirmLine2")
            }}</span>
          </div>
        </div>

        <!-- Transaction History -->
        <div class="w-full mb-15 block">
          <TransactionHistory type="withdrawal" />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm } from "vee-validate";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "~/stores/auth";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";
import { withdrawalSchema } from "@/schemas";

const siteConfig = useSiteConfig();

const props = defineProps<{
  onSuccess?: () => void;
}>();

const { t, locale } = useI18n();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

// Deposit theme drives the shared dark + accent styling.
const dep = computed(() => siteConfig.theme.transactionmodal);

// Bank-account card: dark fill with a top-left accent gradient flowing down
// and an accent glow border (mirrors DepositSummary; the selected method look).
const cardStyle = computed(() => ({
  borderRadius: "12px",
  border: `1.5px solid ${dep.value.accentColor}`,
  background: `radial-gradient(135% 135% at 0% 0%, color-mix(in srgb, ${dep.value.accentColor} 18%, transparent) 0%, color-mix(in srgb, ${dep.value.accentColor} 6%, transparent) 30%, transparent 62%), ${dep.value.inputBgColor}`,
  boxShadow: `0 0 18px color-mix(in srgb, ${dep.value.accentColor} 38%, transparent), inset 0 0 0 1px color-mix(in srgb, ${dep.value.accentColor} 22%, transparent)`,
  fontWeight: "400",
}));

const isRefreshing = ref(false);
async function refreshBalance() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await authStore.verifyUser();
  } catch {
    // Non-fatal — keep the current balance on failure.
  } finally {
    isRefreshing.value = false;
  }
}

// VeeValidate form
const {
  handleSubmit: veeHandleSubmit,
  errors: rawErrors,
  setFieldValue,
  resetForm: veeResetForm,
} = useForm({
  // Reactive schema so the (baked) validation messages follow the active locale
  // instead of freezing to the first language.
  validationSchema: computed(() => {
    void locale.value;
    return withdrawalSchema(t);
  }),
  initialValues: {
    amount: "0",
  },
});

// Only show errors after first submit attempt
const submitted = ref(false);
const errors = computed(() => (submitted.value ? rawErrors.value : {}));

const isSubmitting = ref(false);
const lastSelectedButton = ref<string | null>(null);
const amount = ref("0");

const bankName = computed(() => user.value.bank_name || "");
const bankAccountNumber = computed(() => user.value.bank_account || "");

const currency = useCurrency();

const amountDisplay = computed(() => {
  if (!amount.value || amount.value === "0") return "";
  return `${currency.symbol} ${formatCurrencyInput(amount.value)}`;
});

// Sync local amount to vee-validate field (no eager validation — errors show on submit only)
watch(amount, (newVal) => {
  setFieldValue("amount", newVal, false);
});

const quickAmounts = [
  { value: 5000, label: "5K" },
  { value: 50000, label: "50K" },
  { value: 100000, label: "100K" },
  { value: 250000, label: "250K" },
  { value: 500000, label: "500K" },
  { value: 1000000, label: "1JT" },
];

function formatCurrency(value: string | number): string {
  const num =
    typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  return `${currency.symbol} ${(isNaN(num) ? 0 : num).toLocaleString(currency.locale)}`;
}

function formatCurrencyInput(value: string): string {
  if (!value) return "";
  const num = parseFloat(value.replace(/,/g, "") || "0");
  return num.toLocaleString(currency.locale);
}

function handleAmountChange(value: string) {
  const walletValue = Number(user.value.wallet || 0);
  const cleanValue = value.replace(/[^0-9]/g, "");
  const numValue = Number(cleanValue) || 0;

  if (numValue > walletValue) return;

  amount.value = cleanValue;
}

function handleAmountClick(qa: { value: number; label: string }) {
  const walletValue = Number(user.value.wallet || 0);
  const currentAmount = Number(amount.value.replace(/,/g, "")) || 0;
  const newAmount = currentAmount + qa.value;

  if (newAmount > walletValue) return;

  lastSelectedButton.value = qa.label;
  amount.value = newAmount.toString();
}

function handleMax() {
  const walletValue = Number(user.value.wallet || 0);
  lastSelectedButton.value = "MAX";
  const divisibleValue = walletValue % 10000;
  if (divisibleValue !== 0) {
    amount.value = (walletValue - divisibleValue).toString();
  } else {
    amount.value = walletValue.toString();
  }
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
    const amountWithdrawal = Number(values.amount.replace(/,/g, ""));
    const api = useApi();
    await api("/transactions/withdrawal", {
      method: "POST",
      body: { amount: amountWithdrawal },
    });

    await showSuccessAlert(
      t("withdrawal.title"),
      t("withdrawal.apiMessages.WITHDRAWAL_REQUEST_SUCCESS"),
    );

    amount.value = "0";
    lastSelectedButton.value = null;
    submitted.value = false;
    veeResetForm();
    props.onSuccess?.();
  } catch (error: unknown) {
    const err = error as {
      data?: { message?: string };
      message?: string;
    };
    const errorMessage =
      err?.data?.message ||
      err?.message ||
      "An unexpected error occurred";

    const translatableErrors = [
      "INVALID_AMOUNT",
      "INTERNAL_ERROR",
      "ROLL_REQUIREMENT_ERROR",
      "MEMBER_NOT_FOUND",
      "INSUFFICIENT_ROLL",
      "PENDING_WITHDRAWAL_REQUEST_FOUND",
      "INSUFFICIENT_BALANCE",
      "SETTING_NOT_SET",
      "MINIMUM_AMOUNT_NOT_REACHED",
      "OVER_MAXIMUM_AMOUNT",
      "AMOUNT_NOT_DIVISIBLE",
      "PROMOTION_DEPOSIT_TO_NOT_MET",
    ];

    const translatedMessage = translatableErrors.includes(errorMessage)
      ? t(`withdrawal.apiMessages.${errorMessage}`)
      : errorMessage;

    await showErrorAlert(t("withdrawal.title"), translatedMessage);
  } finally {
    isSubmitting.value = false;
  }
});
</script>

<style scoped>

/* Quick-amount chips — flat dark button; on hover/active/selected the border
   and text take the theme accent with a matching glow. */
.amt-btn {
  height: 45px;
  width: 100%;
  border-radius: 8px;
  font-weight: 600;
  border: 1.7px solid #3c3c3c;
  background: var(--amt-bg);
  color: var(--amt-text);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease,
    filter 0.15s ease;
}

.amt-btn:hover,
.amt-btn:active,
.amt-btn.is-selected {
  border-color: var(--amt-accent);
  color: var(--amt-accent);
  background: linear-gradient(180deg,
      color-mix(in srgb, var(--amt-accent) 28%, var(--amt-bg)) 0%,
      color-mix(in srgb, var(--amt-accent) 10%, var(--amt-bg)) 100%);
  box-shadow:
    0 0 10px color-mix(in srgb, var(--amt-accent) 55%, transparent),
    inset 0 0 8px color-mix(in srgb, var(--amt-accent) 18%, transparent);
}

.amt-btn:active {
  transform: scale(0.96);
}

/* MAX — deep violet */
.amt-max {
  background: linear-gradient(180deg, #3e0a6e 0%, #2a0456 100%);
  border-color: #5a2a86;
  color: #ffffff;
}

.amt-max:hover,
.amt-max:active {
  border-color: #7c3aed;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.55);
  filter: brightness(1.15);
}

/* RESET — red gradient bg with red font */
.amt-reset {
  background: linear-gradient(180deg, #5e1714 0%, #2e0a09 100%);
  border-color: #6e2420;
  color: #ff5347;
}

.amt-reset:hover,
.amt-reset:active {
  border-color: #ff5347;
  color: #ff6a5e;
  box-shadow: 0 0 12px rgba(255, 70, 50, 0.55);
}

/* Config-driven primary action button (theme.transactionmodal) — gradient fill. */
.deposit-primary-btn {
  background: var(--btn-grad);
  color: var(--btn-text);
}

.deposit-primary-btn:hover:not(:disabled) {
  background: var(--btn-grad-hover);
}

/* Accent-tinted confirmation info box. */
.wd-info {
  background: color-mix(in srgb, var(--wd-accent, #ff7a00) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--wd-accent, #ff7a00) 35%, transparent);
  border-radius: 8px;
}
</style>
