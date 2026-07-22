<template>
  <form @submit.prevent="onSubmit">
    <!-- Main Layout -->
    <div class="mb-6 mx-auto w-full max-w-md" style="font-family: var(--font-line-seed)">
      <!-- Single column: the summary card and proof-of-transfer upload were
           removed, which left the old right-hand column holding only the submit
           button — so the two-column split and its vertical divider went with
           them. Width now matches the withdrawal modal's max-w-md body. -->
      <div class="mt-2 md:mt-4">
        <!-- Account request — raises a BANK_ACCOUNT_REQUEST inquiry asking
             support for a deposit account. Sits at the very top: it's what a
             user needs when the account card below shows no bank yet.
             type="button" so it never submits the deposit form. -->
        <button
          type="button" :disabled="isRequestingAccount"
          class="w-full h-[44px] rounded-[12px] text-[15px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          :style="{
            backgroundColor: dep.inputBgColor,
            color: dep.accentColor,
            border: `1px solid ${dep.inputBorderColor}`,
          }"
          @click="handleAccountRequest">
          <svg
            class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
          {{ t("inquiry.depositAccountRequest") }}
        </button>

        <div class="mb-0 md:mb-4 w-full">
          <!-- Account Info Card -->
          <div
class="mt-4 flex flex-col justify-center gap-2 p-4" :style="{
            borderRadius: '10px',
            border: `1px solid ${dep.inputBorderColor}`,
            backgroundColor: dep.inputBgColor,
            fontFamily: 'var(--font-line-seed)',
            fontWeight: '400',
          }">
            <!-- Bank name (no logo image — lead with an emoji instead) -->
            <p class="flex items-center gap-2 text-[15px] lg:text-[17px] text-white">
              <span aria-hidden="true">🏦</span>
              <span>{{ user.bank_name || "—" }}</span>
            </p>
            <div class="text-white">
              <p class="text-[14px] lg:text-[16px] text-white/60">
                {{ user.bank_account_name }}
              </p>
              <p class="text-[17px] lg:text-[19px] tracking-wide">
                {{
                  user.bank_account
                    ? user.bank_account.match(/.{1,4}/g)?.join("-")
                    : ""
                }}
              </p>
            </div>
          </div>

          <!-- Divider -->
          <div class="w-full my-[22px] h-[1px] md:h-[1.5px]" style="background: #666" />

          <!-- Deposit Amount -->
          <div>
            <label class="text-white text-sm mb-2 flex items-center gap-1.5 mt-[-11px]">
              <span :style="{ color: dep.accentColor }">
                <svg
class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </span>
              {{ t("deposit.depositAmount") }}
            </label>
            <input
type="text" :value="`${currency.symbol} ${formatCurrencyInput(depositAmount)}`" :class="[
              'h-11 px-4 py-2 rounded w-full',
              errors.depositAmount ? 'border-2 border-red-500 mb-1' : 'mb-3',
            ]" :style="{
              backgroundColor: dep.inputBgColor,
              color: dep.inputTextColor,
              ...(errors.depositAmount
                ? {}
                : { border: `1px solid ${dep.inputBorderColor}` }),
            }" @input="handleAmountInput">
            <p v-if="errors.depositAmount" class="text-xs text-red-500 mb-2">
              {{ errors.depositAmount }}
            </p>
            <div class="grid grid-cols-4 gap-1.5 mt-3">
              <!-- Quick amount chips -->
              <button
v-for="amount in quickAmounts" :key="amount" type="button"
                class="amt-btn text-[15px] md:text-[17px]" :style="{
                  '--amt-bg': dep.quickAmountBgColor,
                  '--amt-text': dep.quickAmountTextColor,
                  '--amt-accent': dep.accentColor,
                }" @click="handleAmountClick(amount)">
                {{ getTranslatedAmount(amount) }}
              </button>

              <!-- MAX (violet) -->
              <button type="button" class="amt-btn amt-max text-[15px] md:text-[17px]" @click="handleMax">
                {{ t("deposit.max") }}
              </button>

              <!-- RESET (red) -->
              <button type="button" class="amt-btn amt-reset text-[15px] md:text-[16px]" @click="handleReset">
                {{ t("deposit.reset") }}
              </button>
            </div>
          </div>
        </div>

        <!-- Deposit Button -->
        <div class="mb-6 font-medium w-full">
          <div class="relative">
            <button
type="submit"
              class="deposit-primary-btn text-[19px] h-[48px] relative w-full font-bold transition-colors z-10" :style="{
                '--btn-grad': siteConfig.theme.transactionmodal.buttonGradientColor,
                '--btn-grad-hover': siteConfig.theme.transactionmodal.buttonGradientHoverColor,
                '--btn-text': siteConfig.theme.transactionmodal.buttonTextColor,
                borderRadius: '12px',
                border: '1.7px solid #3c3c3c',
              }">
              {{ t("deposit.depositButton") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  useBankPayment,
  type IBankAccount,
} from "@/components/transaction/useBankPayment";
import { useAuthStore } from "~/stores/auth";

const props = defineProps<{
  bankAccounts?: IBankAccount[];
}>();

const { t } = useI18n();

// The account card shows the logged-in user's own registered bank (from Better Auth get-session),
// not the deposit destination account.
const authStore = useAuthStore();
const user = computed(() => authStore.user);

const {
  siteConfig,
  currency,
  errors,
  depositAmount,
  quickAmounts,
  getTranslatedAmount,
  formatCurrencyInput,
  handleAmountInput,
  handleAmountClick,
  handleMax,
  handleReset,
  onSubmit,
} = useBankPayment({
  bankAccounts: () => props.bankAccounts,
});

const dep = computed(() => siteConfig.theme.transactionmodal);

// "Account request" button — posts a BANK_ACCOUNT_REQUEST inquiry. No refresh
// callback is passed: the deposit modal has no inquiry list to refresh, and the
// mutation's alert already confirms the request.
const { requestBankAccount } = useInquiryMutations();
const isRequestingAccount = ref(false);

async function handleAccountRequest() {
  if (isRequestingAccount.value) return; // guard double-submits
  isRequestingAccount.value = true;
  try {
    await requestBankAccount();
  } finally {
    isRequestingAccount.value = false;
  }
}
</script>

<style scoped>
/* Quick-amount chips — flat dark button; on hover/active the border and text
   take the theme accent with a matching glow (no 3D bottom border). */
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
.amt-btn:active {
  border-color: var(--amt-accent);
  color: var(--amt-accent);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--amt-accent) 28%, var(--amt-bg)) 0%,
    color-mix(in srgb, var(--amt-accent) 10%, var(--amt-bg)) 100%
  );
  box-shadow:
    0 0 10px color-mix(in srgb, var(--amt-accent) 55%, transparent),
    inset 0 0 8px color-mix(in srgb, var(--amt-accent) 18%, transparent);
}

.amt-btn:active {
  transform: scale(0.96);
}

/* MAX — violet */
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
</style>
