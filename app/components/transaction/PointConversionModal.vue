<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-3 md:p-4"
        @click.self="onClose">
        <div class="relative w-full md:max-w-[520px] max-h-[calc(100dvh-2rem)] flex flex-col" role="dialog"
          :aria-label="t('point.title')">
          <!-- Header -->
          <div class="flex-shrink-0 px-5 pt-3.5 pb-1 flex items-center justify-center relative">
            <span class="text-white font-extrabold text-lg md:text-xl uppercase tracking-[0.08em]">{{ t('point.title')
            }}</span>
            <button type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              :aria-label="t('common.close')" @click="onClose">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 26 26" fill="none">
                <line x1="1.44191" y1="1.01958" x2="24.9799" y2="24.5575" stroke="#bdbdbd" stroke-width="2.03917"
                  stroke-linecap="round" />
                <line x1="1.01959" y1="-1.01959" x2="34.3073" y2="-1.01959"
                  transform="matrix(-0.707107 0.707107 0.707107 0.707107 26 1.01959)" stroke="#bdbdbd"
                  stroke-width="2.03917" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="tm-modal modal-body-fill modal-gradient-border rounded-[18px] flex flex-col flex-1 min-h-0 overflow-hidden mt-1.5"
            :style="borderStyle">
            <div class="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-5">
              <!-- Available points hero -->
              <div class="flex items-center justify-between rounded-lg px-4 py-3.5 border"
                :style="{ background: dep.inputBgColor, borderColor: dep.inputBorderColor }">
                <div class="flex items-center gap-3">
                  <span class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    :style="{ background: accent }">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" stroke-width="2.1">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-9L21 7.5m0 0L16.5 3m4.5 4.5H7.5" />
                    </svg>
                  </span>
                  <span class="text-white/60 text-sm font-semibold leading-tight">{{ t('point.available') }}</span>
                </div>
                <div class="flex items-baseline gap-1">
                  <span class="text-white font-extrabold text-2xl tabular-nums leading-none">{{ fmt(pointCurrent)
                  }}</span>
                  <span class="text-white/45 text-base font-bold">P</span>
                </div>
              </div>

              <!-- Before / After ledger -->
              <div class="rounded-lg border px-4 py-4"
                :style="{ background: dep.inputBgColor, borderColor: dep.inputBorderColor }">
                <div class="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-3 items-center">
                  <!-- Column headers -->
                  <div class="text-center text-white/45 text-xs uppercase tracking-wider font-bold">{{ t('point.before')
                  }}</div>
                  <div />
                  <div class="text-center text-xs uppercase tracking-wider font-bold" :style="{ color: accent }">
                    {{ t('point.after') }}</div>

                  <!-- Point row -->
                  <div class="rounded px-3 py-2.5 flex items-center justify-between gap-2 bg-black/25">
                    <span class="text-white/50 text-xs font-semibold">{{ t('point.point') }}</span>
                    <span class="text-white font-bold text-[15px] tabular-nums">{{ fmt(pointCurrent) }}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto text-white/30" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <div class="rounded px-3 py-2.5 flex items-center justify-between gap-2 bg-black/25">
                    <span class="text-white/50 text-xs font-semibold">{{ t('point.point') }}</span>
                    <span class="text-white font-bold text-[15px] tabular-nums">{{ fmt(pointAfter) }}</span>
                  </div>

                  <!-- Balance row -->
                  <div class="rounded px-3 py-2.5 flex items-center justify-between gap-2 bg-black/25">
                    <span class="text-white/50 text-xs font-semibold">{{ t('point.balance') }}</span>
                    <span class="text-white font-bold text-[15px] tabular-nums">{{ fmt(balanceCurrent) }}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto text-white/30" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <div class="rounded px-3 py-2.5 flex items-center justify-between gap-2 border"
                    :style="{ borderColor: accent, background: 'rgba(255,255,255,0.04)' }">
                    <span class="text-white/50 text-xs font-semibold">{{ t('point.balance') }}</span>
                    <span class="font-extrabold text-[15px] tabular-nums" :style="{ color: accent }">{{ fmt(balanceAfter)
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Amount input -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-white text-sm font-medium">{{ t('point.turningPoint') }}</label>
                </div>
                <div class="relative">
                  <input :value="amount" inputmode="numeric" placeholder="0"
                    class="h-11 px-4 py-2 pr-9 rounded w-full text-right font-bold tabular-nums outline-none" :style="{
                      backgroundColor: dep.inputBgColor,
                      color: dep.inputTextColor,
                      border: `1px solid ${dep.inputBorderColor}`,
                    }" @input="onAmountInput">
                  <span
                    class="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold pointer-events-none">P</span>
                </div>
                <p class="text-white/40 text-xs mt-2 leading-snug">{{ t('point.notes') }}</p>

                <!-- Quick amounts (same sizing as deposit/withdraw) -->
                <div class="grid grid-cols-4 gap-1.5 mt-3">
                  <button v-for="q in QUICK_AMOUNTS" :key="q.label" type="button"
                    class="amt-btn text-[15px] md:text-[17px] tabular-nums" :style="{
                      '--amt-bg': dep.quickAmountBgColor,
                      '--amt-text': dep.quickAmountTextColor,
                      '--amt-accent': dep.accentColor,
                    }" @click="addAmount(q.value)">
                    {{ quickLabel(q.label) }}
                  </button>
                  <button type="button" class="amt-btn amt-max text-[15px] md:text-[17px]" @click="setMax">
                    {{ t('point.maxAmount') }}
                  </button>
                  <button type="button" class="amt-btn amt-reset text-[15px] md:text-[16px]" @click="clearAmount">
                    {{ t('point.clear') }}
                  </button>
                </div>
              </div>

              <!-- Submit (same sizing as deposit) -->
              <button type="button" :disabled="!canSubmit || isLoading"
                class="deposit-primary-btn text-[19px] h-[48px] relative w-full font-bold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :style="{
                  '--btn-grad': dep.buttonGradientColor,
                  '--btn-grad-hover': dep.buttonGradientHoverColor,
                  '--btn-text': dep.buttonTextColor,
                }" @click="submit">
                {{ isLoading ? t('common.loading') : t('point.convert') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useCurrency } from "@/composables/useCurrency";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const siteConfig = useSiteConfig();
const authStore = useAuthStore();
const currency = useCurrency();

const dep = computed(() => siteConfig.theme.transactionmodal);
const accent = computed(() => dep.value.accentColor);

// Shared `.tm-modal` chrome tokens (same as DepositModal/Withdrawal/signup).
const borderStyle = computed(() => ({
  "--body-bg": dep.value.modalBgColor,
  "--b-mid": dep.value.borderColor,
  "--b-accent": dep.value.accentColor,
  "--tm-input-ph": dep.value.inputPlaceholderColor,
  "--tm-accent": dep.value.accentColor,
}));

// Same quick-amount set as the deposit/withdraw modals.
const QUICK_AMOUNTS = [
  { value: 5000, label: "5K" },
  { value: 50000, label: "50K" },
  { value: 100000, label: "100K" },
  { value: 250000, label: "250K" },
  { value: 500000, label: "500K" },
  { value: 1000000, label: "1JT" },
] as const;

const quickLabel = (label: string) =>
  t(`common.quickAmounts.${label}`) || label;

const amount = ref("");

const pointCurrent = computed(() => Number(authStore.user.point_wallet) || 0);
const balanceCurrent = computed(() => Number(authStore.user.wallet) || 0);
const amt = computed(() => Number(amount.value) || 0);

// Converting points → balance: points go down, balance goes up. Clamp to the
// available point balance (can't convert more points than you hold).
const over = computed(() => amt.value > pointCurrent.value);
const pointAfter = computed(() =>
  over.value ? pointCurrent.value : pointCurrent.value - amt.value,
);
const balanceAfter = computed(() =>
  over.value ? balanceCurrent.value : balanceCurrent.value + amt.value,
);

const canSubmit = computed(() => amt.value >= 1 && amt.value <= pointCurrent.value);

const fmt = (v: number) => currency.formatNumber(v);

function onAmountInput(e: Event) {
  amount.value = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, "");
}

function setMax() {
  amount.value = String(Math.trunc(pointCurrent.value));
}

function addAmount(v: number) {
  amount.value = String((Number(amount.value) || 0) + v);
}

function clearAmount() {
  amount.value = "";
}

function onClose() {
  emit("close");
}

const isLoading = ref(false);

async function submit() {
  if (amt.value < 1) {
    await showErrorAlert(t("point.title"), t("point.amountCheck"));
    return;
  }
  if (amt.value > pointCurrent.value) {
    await showErrorAlert(t("point.title"), t("point.amountGt"));
    return;
  }

  isLoading.value = true;
  try {
    // NOTE: no backend endpoint yet — this optimistically updates the local
    // wallet so the UI reflects the conversion. Wire to the real point-transfer
    // API (e.g. POST /tran/point { amount }) when it exists; see
    // PLAN-HEADER-POINT-CONVERSION.md.
    const converted = amt.value;
    authStore.updateUser({
      point_wallet: String(pointCurrent.value - converted),
      wallet: String(balanceCurrent.value + converted),
    });
    amount.value = "";
    await showSuccessAlert(
      t("point.title"),
      t("point.convertSuccess", { amount: currency.formatNumber(converted) }),
    );
    onClose();
  } finally {
    isLoading.value = false;
  }
}

// Reset the input whenever the modal is (re)opened.
watch(
  () => props.isOpen,
  (open) => {
    if (open) amount.value = "";
  },
);
</script>

<style scoped>
/* Quick-amount chips — same spec as the deposit/withdraw modals
   (BankPaymentContent.vue) so the point modal matches their look + sizing. */
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

/* CLEAR/RESET — red gradient bg with red font */
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

/* Config-driven primary action button (theme.transactionmodal) — matches
   deposit/withdraw. */
.deposit-primary-btn {
  background: var(--btn-grad);
  color: var(--btn-text);
}

.deposit-primary-btn:hover:not(:disabled) {
  background: var(--btn-grad-hover);
}
</style>
