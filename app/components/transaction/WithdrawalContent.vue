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

        <!-- Bank Account Card (dark with accent glow border).
             Stacked: bank name, then the account number, then the holder under
             it. No logo or icon mark — the text carries it. -->
        <div v-if="bankName && bankAccountNumber" class="relative mb-5 px-3.5 py-2.5" :style="cardStyle">
          <!-- Bank name — text only; no logo/emoji mark. -->
          <p class="min-w-0 truncate text-white/75 font-semibold text-[14px] lg:text-[15px] tracking-tight">
            {{ user.bank_name || t("withdrawal.bankName") }}
          </p>

          <!-- Hairline in the theme accent — separates the header from the
               account block without spending the space a margin would. -->
          <div class="my-1.5 h-px" :style="{
            background: `linear-gradient(90deg, color-mix(in srgb, ${dep.accentColor} 30%, transparent) 0%, transparent 100%)`,
          }" />

          <!-- Account number — set in the card-number face
               (see .wd-account-number). `leading-none` trims the line box to the
               glyphs; the face's default leading was adding vertical air that
               read as padding inside the card. -->
          <p class="wd-account-number leading-none text-white/90 text-[18px] lg:text-[21px]">
            {{ accountNumberDisplay }}
          </p>

          <!-- Holder below the number. `shrink-0` on the label keeps "예금주 :"
               intact and truncates a long name instead. -->
          <p class="mt-1 flex min-w-0 items-baseline gap-1 leading-none text-white/70 text-[12px] lg:text-[13px]">
            <span class="shrink-0">{{ t("withdrawal.accountHolder") }} :</span>
            <span class="truncate">{{ user.bank_account_name }}</span>
          </p>
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
        <!-- Amount + RESET on one row. RESET clears the field it sits beside,
             so it belongs here rather than in the chip grid, where it read as a
             seventh "amount" among the six. -->
        <div class="flex items-stretch gap-2">
          <input type="text" :value="amountDisplay" :placeholder="`${currency.symbol} 0`" maxlength="15"
            class="px-4 py-3 rounded min-w-0 flex-1 text-base lg:text-[20px] h-[53px]" :style="{
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
          <!-- Width is inline, not a `w-*` utility: `.amt-btn` below sets
               `width: 100%` for the grid chips, and being a later same-specificity
               rule it beats the utility — the button took the whole row. -->
          <button type="button" class="amt-btn amt-reset text-[15px] md:text-[16px]"
            style="height: 53px; width: 92px; flex: 0 0 92px" @click="handleReset">
            {{ t("withdrawal.reset") }}
          </button>
        </div>
        <p v-if="errors.amount" class="text-xs text-red-500 mt-1">
          {{ errors.amount }}
        </p>

        <!-- Six quick-amount chips, 3 per row. MAX was removed at the same time
             as the deposit modal's, so the two read alike; the chips already
             reach the balance, and `clampWithdrawal` still caps every add. -->
        <div class="grid grid-cols-3 gap-2 mt-4">
          <button v-for="qa in quickAmounts" :key="qa.label" type="button" class="amt-btn text-[15px] md:text-[17px]"
            :class="{ 'is-selected': lastSelectedButton === qa.label }" :style="{
              '--amt-bg': dep.quickAmountBgColor,
              '--amt-text': dep.quickAmountTextColor,
              '--amt-accent': dep.accentColor,
            }" @click="handleAmountClick(qa)">
            {{ quickLabel(qa.label) }}
          </button>
        </div>

        <!-- Withdrawal password (출금 비밀번호). The API verifies it against
             `members.withdrawal_password` before touching the wallet — a
             credential separate from the login password, so a session alone
             cannot move money. -->
        <div class="mt-4">
          <label class="text-white text-sm mb-2 flex items-center gap-1.5">
            <span :style="{ color: dep.accentColor }">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            {{ t("withdrawal.password") }}
          </label>
          <input v-model="passwordField" type="password" autocomplete="current-password" maxlength="100"
            :placeholder="t('withdrawal.passwordPlaceholder')"
            class="px-4 py-3 rounded w-full text-base lg:text-[20px] h-[53px]" :style="{
              backgroundColor: dep.inputBgColor,
              color: dep.inputTextColor,
              border: `1px solid ${dep.inputBorderColor}`,
              borderRadius: '4px',
            }">
          <p v-if="errors.password" class="text-xs text-red-500 mt-1">
            {{ errors.password }}
          </p>
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
import { idempotencyHeaders } from "@/lib/idempotency";
// Min/max/divisible come from the CMS (`withdrawals:*` in /site/settings).

const siteConfig = useSiteConfig();

const props = defineProps<{
  onSuccess?: () => void;
}>();

const { t, locale } = useI18n();
const apiMessage = useApiMessage();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

// Deposit theme drives the shared dark + accent styling.
const dep = computed(() => siteConfig.theme.transactionmodal);

// Bank-account card: dark fill with a top-left accent gradient flowing down
// and an accent glow border (the selected-method look).
// Softer than the old treatment: a 1px hairline border and a tighter glow read
// as a surface rather than a neon outline, which is what let the card shrink to
// two rows without looking cramped.
const cardStyle = computed(() => ({
  borderRadius: "14px",
  border: `1px solid color-mix(in srgb, ${dep.value.accentColor} 55%, transparent)`,
  background: `radial-gradient(135% 135% at 0% 0%, color-mix(in srgb, ${dep.value.accentColor} 16%, transparent) 0%, color-mix(in srgb, ${dep.value.accentColor} 5%, transparent) 32%, transparent 64%), ${dep.value.inputBgColor}`,
  boxShadow: `0 0 12px color-mix(in srgb, ${dep.value.accentColor} 22%, transparent), inset 0 0 0 1px color-mix(in srgb, ${dep.value.accentColor} 12%, transparent)`,
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

const limits = useTransactionLimits("withdrawals");

// VeeValidate form
const {
  handleSubmit: veeHandleSubmit,
  errors: rawErrors,
  setFieldValue,
  resetForm: veeResetForm,
  defineField,
} = useForm({
  // Reactive schema so the (baked) validation messages follow the active locale
  // instead of freezing to the first language.
  validationSchema: computed(() => {
    void locale.value;
    return withdrawalSchema(t, limits.value);
  }),
  initialValues: {
    amount: "0",
    password: "",
  },
});

const [passwordField] = defineField("password");

// Only show errors after first submit attempt
const submitted = ref(false);
const errors = computed(() => (submitted.value ? rawErrors.value : {}));

const isSubmitting = ref(false);
const lastSelectedButton = ref<string | null>(null);
const amount = ref("0");

const bankName = computed(() => user.value.bank_name || "");
const bankAccountNumber = computed(() => user.value.bank_account || "");

// Account number in 4-digit groups (1234-5678-9012).
const accountNumberDisplay = computed(
  () => bankAccountNumber.value.match(/.{1,4}/g)?.join("-") ?? "",
);

const currency = useCurrency();

const amountDisplay = computed(() => {
  if (!amount.value || amount.value === "0") return "";
  return `${currency.symbol} ${formatCurrencyInput(amount.value)}`;
});

// Sync local amount to vee-validate field (no eager validation — errors show on submit only)
watch(amount, (newVal) => {
  setFieldValue("amount", newVal, false);
});

// Kept in step with the deposit/point-transfer chips.
const quickAmounts = [
  { value: 10000, label: "10K" },
  { value: 50000, label: "50K" },
  { value: 100000, label: "100K" },
  { value: 500000, label: "500K" },
  { value: 1000000, label: "1JT" },
  { value: 5000000, label: "5JT" },
];

// The label is an id (`common.quickAmounts.<label>`), not display text — it was
// being rendered raw here, which is why these chips read "5K" while the deposit
// modal's read 5만.
const quickLabel = (label: string) =>
  t(`common.quickAmounts.${label}`) || label;

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

/**
 * The largest withdrawable amount not exceeding `value`.
 *
 * Caps at the wallet balance and the configured maximum, then rounds DOWN to the
 * configured step — rounding down matters because an amount over the step would
 * be rejected by the divisibility rule at submit.
 */
function clampWithdrawal(value: number): number {
  const walletValue = Number(user.value.wallet || 0);
  const capped = Math.min(value, walletValue, limits.value.maximum);
  const step = limits.value.divisible;
  return step > 0 ? capped - (capped % step) : Math.max(capped, 0);
}

function handleAmountClick(qa: { value: number; label: string }) {
  const currentAmount = Number(amount.value.replace(/,/g, "")) || 0;

  // Clamped rather than ignored: the previous guard returned early once the
  // total would exceed the balance, so repeated clicks near the top simply did
  // nothing. Topping out at the maximum is what the button implies.
  lastSelectedButton.value = qa.label;
  amount.value = clampWithdrawal(currentAmount + qa.value).toString();
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
      headers: idempotencyHeaders(),
      body: {
        amount: amountWithdrawal,
        withdrawalPassword: values.password,
      },
    });

    // Title only — no supporting line (showSuccessAlert's `text` is optional).
    await showSuccessAlert(t("withdrawal.success"));

    amount.value = "0";
    lastSelectedButton.value = null;
    submitted.value = false;
    veeResetForm();
    props.onSuccess?.();
  } catch (error: unknown) {
    // The old hardcoded `translatableErrors` allowlist is gone — apiMessage()
    // already translates only tokens that exist in withdrawal.apiMessages, so
    // the list was a second copy of the i18n file that had to be kept in sync.
    await showErrorAlert(t("withdrawal.title"), apiMessage(error, "withdrawal"));
  } finally {
    isSubmitting.value = false;
  }
});
</script>

<style scoped>

/* Card-number face — Kode Mono is a squarish technical monospace, so the number
   reads as a machine readout while staying solid and legible (unlike a
   dot-matrix face). Monospace, so the digits land on a strict grid.
   Declared in nuxt.config `fonts.families`, so @nuxt/fonts subsets it at build
   time and serves it same-origin from /_fonts (no remote stylesheet).
   Fallbacks stay monospace so the digits keep even spacing if it fails to load;
   tabular-nums only matters for those fallbacks. */
.wd-account-number {
  font-family: "Kode Mono", ui-monospace, "Courier New", monospace;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
}

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
