<template>
  <Teleport to="body">
    <Transition name="modal">
      <!-- Top-aligned rather than centred. The panel is short, so centring left
           it floating mid-screen; anchoring it near the top puts it where a
           modal is expected and keeps it clear of the mobile keyboard when the
           amount field takes focus. `overflow-y-auto` on the backdrop so a
           short viewport can still scroll to the submit button. -->
      <div v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 px-3 pt-[6vh] pb-6 md:pt-[8vh] md:px-4"
        @click.self="onClose">
        <div class="relative w-full md:max-w-[520px] max-h-[calc(100dvh-10vh)] flex flex-col" role="dialog"
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
              <!-- No border: the fill already separates this panel from the
                   modal surface, and the outline competed with the amount field
                   below, which is the only thing here to act on. -->
              <div class="flex items-center justify-between rounded-lg px-4 py-3.5"
                :style="{ background: dep.inputBgColor }">
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

              <!-- Amount input -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-white text-sm font-medium">{{ t('point.turningPoint') }}</label>
                </div>
                <!-- Amount + MAX/RESET on one row: both act on the field they
                     sit beside. Widths are inline because `.amt-btn` sets
                     `width: 100%` for grid use, and as a later same-specificity
                     rule it beats a `w-*` utility. -->
                <div class="flex items-stretch gap-1.5">
                  <div class="relative min-w-0 flex-1">
                    <input :value="amount" inputmode="numeric" placeholder="0"
                      class="h-11 px-4 py-2 pr-9 rounded w-full text-right font-bold tabular-nums outline-none" :style="{
                        backgroundColor: dep.inputBgColor,
                        color: dep.inputTextColor,
                        border: `1px solid ${dep.inputBorderColor}`,
                      }" @input="onAmountInput">
                    <span
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold pointer-events-none">P</span>
                  </div>
                  <button type="button" class="amt-btn amt-max text-[15px] md:text-[17px]"
                    style="height: 44px; width: 78px; flex: 0 0 78px" @click="setMax">
                    {{ t('point.maxAmount') }}
                  </button>
                  <button type="button" class="amt-btn amt-reset text-[15px] md:text-[16px]"
                    style="height: 44px; width: 78px; flex: 0 0 78px" @click="clearAmount">
                    {{ t('point.clear') }}
                  </button>
                </div>
                <p class="text-white/40 text-xs mt-2 leading-snug">{{ t('point.notes') }}</p>
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
import { useApi } from "@/composables/useApi";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const apiMessage = useApiMessage();
const siteConfig = useSiteConfig();
const authStore = useAuthStore();
const currency = useCurrency();

const dep = computed(() => siteConfig.theme.transactionmodal);
const accent = computed(() => dep.value.accentColor);

// Shared `.tm-modal` chrome tokens (same as DepositModal/Withdrawal/signup).
const borderStyle = useModalTheme();

const amount = ref("");

const pointCurrent = computed(() => Number(authStore.user.point_wallet) || 0);
const amt = computed(() => Number(amount.value) || 0);

// Converting points → balance: convert at least 1 point, never more than the
// balance on hand. The before/after projection panel and the additive
// quick-amount ladder were removed — MAX and RESET are the only shortcuts.
const canSubmit = computed(() => amt.value >= 1 && amt.value <= pointCurrent.value);

const fmt = (v: number) => currency.formatNumber(v);

function onAmountInput(e: Event) {
  amount.value = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, "");
}

function setMax() {
  amount.value = String(Math.trunc(pointCurrent.value));
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
    const converted = amt.value;
    // POST /points/exchange { amount } converts points → wallet. On success we
    // re-verify to pull the authoritative point/wallet balances rather than
    // optimistically mutating them (money safety).
    const api = useApi();
    await api("/points/exchange", {
      method: "POST",
      body: { amount: converted },
    });
    await authStore.verifyUser().catch(() => {});
    amount.value = "";
    await showSuccessAlert(
      t("point.title"),
      t("point.convertSuccess", { amount: currency.formatNumber(converted) }),
    );
    onClose();
  } catch (err: unknown) {
    await showErrorAlert(
      t("point.title"),
      apiMessage(err, "point", "point.convertFailed"),
    );
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
