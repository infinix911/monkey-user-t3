<template>
  <form @submit.prevent="onSubmit">
    <!-- Main Layout -->
    <div
class="mb-6" style="
        font-family: var(--font-line-seed);
        max-width: 957px;
        margin: 0 auto;
      ">
      <div class="flex flex-col md:flex-row gap-4 md:mt-[35px]">
        <!-- Left Column: Account + Amount -->
        <div class="mb-0 md:mb-6 w-full md:w-1/2 md:pr-6">
          <label class="text-white text-sm mb-2 flex items-center gap-1.5">
            <span :style="{ color: dep.accentColor }">
              <svg
class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </span>
            Deposit
          </label>
          <!-- Bank is fixed by the API — displayed statically, not selectable. -->
          <div
            class="h-11 px-4 py-2 rounded w-full flex items-center" :style="{
              backgroundColor: dep.inputBgColor,
              color: dep.inputTextColor,
              border: `1px solid ${dep.inputBorderColor}`,
            }">
            <span>{{ selectedBankAccount?.bank || "—" }}</span>
          </div>

          <!-- Account Info Card -->
          <div
class="mt-4 flex flex-col justify-between relative min-h-[167px]" :style="{
            borderRadius: '10px',
            border: `1px solid ${dep.inputBorderColor}`,
            backgroundColor: dep.inputBgColor,
            fontFamily: 'var(--font-line-seed)',
            fontWeight: '400',
          }">
            <NuxtImg
v-if="selectedBankAccount"
              :src="`${siteConfig.assets.transaction.bankBasePath}/${selectedBankAccount.bank.replaceAll(' ', '')}.png`"
              alt="Bank Logo" style="
                position: absolute;
                bottom: 50%;
                left: 12px;
                width: auto;
                height: 50px;
                object-fit: cover;
              " />
            <div class="text-white absolute bottom-[-5px] left-0 right-0 p-4">
              <p class="text-[17px] lg:text-[19px] tracking-wide mb-[-17px] md:mb-[-14.5px]">
                {{
                  selectedBankAccount
                    ? selectedBankAccount.account_number
                      .match(/.{1,4}/g)
                      ?.join("-")
                    : ""
                }}
              </p>
              <div class="flex items-end justify-between">
                <p class="text-[14px] lg:text-[16px] text-white/60">
                  {{
                    selectedBankAccount ? selectedBankAccount.account_name : ""
                  }}
                </p>
                <button
v-if="selectedBankAccount" type="button"
                  class="mb-0.5 p-1 hover:opacity-75 transition-opacity cursor-pointer" title="Copy account number"
                  @click="
                    handleCopy(
                      selectedBankAccount.account_number,
                      'accountNumber',
                    )
                    ">
                  <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_698_12634)">
                      <path
                        d="M18 1.125H4.5C3.2625 1.125 2.25 2.1375 2.25 3.375V19.125H4.5V3.375H18V1.125ZM21.375 5.625H9C7.7625 5.625 6.75 6.6375 6.75 7.875V23.625C6.75 24.8625 7.7625 25.875 9 25.875H21.375C22.6125 25.875 23.625 24.8625 23.625 23.625V7.875C23.625 6.6375 22.6125 5.625 21.375 5.625ZM21.375 23.625H9V7.875H21.375V23.625Z"
                        fill="#AFAFAF" />
                    </g>
                    <defs>
                      <clipPath id="clip0_698_12634">
                        <rect width="27" height="27" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </button>
              </div>
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

        <!-- Vertical Divider -->
        <div
class="self-stretch" style="
            width: 1.5px;
            background: rgba(138, 134, 134, 0.4);
            min-height: 100%;
          " />
        <div class="w-full block md:hidden h-[1px]" style="background: #666" />

        <!-- Right Column: Voucher + Summary + Upload + Submit -->
        <div class="mb-6 font-medium w-full md:w-1/2 md:pl-6">
          <!-- Voucher (hidden for PULSA — no voucher on pulsa deposits) -->
          <template v-if="paymentType !== 'PULSA'">
            <label class="text-white text-sm mb-2 flex items-center gap-1.5">
              <span :style="{ color: dep.accentColor }">
                <svg
class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path
                    d="M2 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v14" />
                </svg>
              </span>
              {{ t("deposit.voucher") }}
            </label>
            <div class="relative mb-4">
              <select
:value="selectedVoucher?.issue_id || ''"
                class="font-normal px-4 py-2 rounded w-full appearance-none pr-10" :style="{
                  height: '45px',
                  backgroundColor: dep.inputBgColor,
                  color: dep.inputTextColor,
                  border: `1px solid ${dep.inputBorderColor}`,
                }" :disabled="loadingVouchers" @change="handleVoucherChange">
                <option value="">{{ t("deposit.selectVoucher") }}</option>
                <option v-for="voucher in vouchers" :key="voucher.issue_id" :value="voucher.issue_id">
                  {{ voucher.voucher }}
                </option>
              </select>
              <svg
class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </template>

          <!-- Transaction Summary -->
          <DepositSummary
:deposit-amount="depositAmountNum" :service-fee="serviceFee" :net-amount="netAmount"
            :bonus="bonus" :total-net-amount="totalNetAmount" />

          <!-- Divider -->
          <div class="w-full mt-7 mb-5" style="height: 1px; background: #666" />

          <!-- Proof Transfer -->
          <div class="mb-[21px]">
            <label class="text-white text-sm mb-2 block">
              {{ t("deposit.proofTransfer") }}
            </label>
            <div class="flex gap-3">
              <label
                class="text-nowrap text-[15px] md:text-[18px] bg-black hover:bg-[#1a1a1a] text-white px-4 pt-3 md:pt-2 rounded cursor-pointer transition-colors border border-[#3c3c3c]">
                <input type="file" class="hidden" accept="image/*" @change="handleFileChange">
                {{ t("deposit.selectFile") }}
              </label>
              <input
type="text" :value="fileName" readonly class="px-3 lg:px-6 py-2 rounded flex-1 w-full" :style="{
                height: '45px',
                backgroundColor: dep.inputBgColor,
                color: dep.inputTextColor,
                border: `1px solid ${dep.inputBorderColor}`,
              }">
            </div>
          </div>

          <!-- Deposit Button -->
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

    <!-- Voucher Popup Modal -->
    <VoucherPopupModal
      :is-open="showVoucherPopup"
      :popup-text="pendingVoucher?.popup_text ?? null"
      @agree="handlePopupAgree"
      @disagree="handlePopupDisagree"
    />
  </form>
</template>

<script setup lang="ts">
import {
  useBankPayment,
  type IBankAccount,
} from "@/components/transaction/useBankPayment";
import VoucherPopupModal from "@/components/transaction/VoucherPopupModal.vue";

const props = defineProps<{
  bankAccounts?: IBankAccount[];
  paymentType?: string;
}>();

const { t } = useI18n();

const {
  siteConfig,
  currency,
  errors,
  vouchers,
  loadingVouchers,
  depositAmount,
  selectedVoucher,
  showVoucherPopup,
  pendingVoucher,
  fileName,
  selectedBankAccount,
  depositAmountNum,
  bonus,
  serviceFee,
  netAmount,
  totalNetAmount,
  quickAmounts,
  getTranslatedAmount,
  formatCurrencyInput,
  handleAmountInput,
  handleAmountClick,
  handleMax,
  handleReset,
  handleVoucherChange,
  handlePopupAgree,
  handlePopupDisagree,
  handleFileChange,
  handleCopy,
  onSubmit,
} = useBankPayment({
  bankAccounts: () => props.bankAccounts,
  paymentType: () => props.paymentType,
});

const dep = computed(() => siteConfig.theme.transactionmodal);
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
