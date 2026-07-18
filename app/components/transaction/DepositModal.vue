<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black px-2 md:p-4"
        @click.self="onClose">
        <div
          class="relative w-full h-dvh md:h-auto md:max-h-[calc(100dvh-2rem)] xl:min-h-[calc(100vh-2rem)] xl:max-h-[calc(100vh-2rem)] flex flex-col max-w-[958px]"
          role="dialog" :aria-label="t('deposit.title')">
          <!-- Header -->
          <DepositModalHeader @close="onClose" />

          <div class="tm-modal modal-body-fill modal-gradient-border rounded-[18px] flex flex-col flex-1 min-h-0 overflow-hidden"
            :style="borderStyle">
            <!-- Payment Type Tabs -->
            <PaymentTypeTabs v-model="paymentType" />

            <!-- Scrollable Content -->
            <div
              class="modal-body-fill flex-1 overflow-y-auto deposit-modal-scrollbar rounded-xl min-h-0 mt-3 md:mt-4 mb-3 md:mb-4"
              :style="{ '--body-bg': dep.modalBgColor }" style="scrollbar-width: thin; scrollbar-color: #4a4a4a #2a2a2a">
              <div class="px-4 md:px-6 lg:px-10 py-5">
                <!-- BANK / E-MONEY / PULSA Payment Content -->
                <BankPaymentContent :bank-accounts="bankAccounts" :payment-type="paymentType" />

                <!-- Deposit History Table -->
                <div class="hidden md:block">
                  <TransactionHistory type="deposit" :method="historyMethod" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useDepositModal } from "@/components/transaction/useDepositModal";
import DepositModalHeader from "@/components/transaction/DepositModalHeader.vue";
import PaymentTypeTabs from "@/components/transaction/PaymentTypeTabs.vue";

// Payment-type subtrees are only rendered one at a time; make them async
// so the unused options aren't fetched until selected.

const BankPaymentContent = defineAsyncComponent(
  () => import("@/components/transaction/BankPaymentContent.vue"),
);

const siteConfig = useSiteConfig();
const dep = computed(() => siteConfig.theme.transactionmodal);

// Panel border + input theming — fed to the shared `.modal-gradient-border` /
// `.tm-modal` classes (main.css) so deposit, withdrawal and signup share one
// border + input style. The gradient glows in the center and fades at corners.
const borderStyle = computed(() => ({
  "--body-bg": dep.value.modalBgColor,
  "--b-mid": dep.value.borderColor,
  "--b-accent": dep.value.accentColor,
  // Shared input theming (placeholder + focus) for fields inside `.tm-modal`.
  "--tm-input-ph": dep.value.inputPlaceholderColor,
  "--tm-accent": dep.value.accentColor,
}));

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const { paymentType, bankAccounts, historyMethod } = useDepositModal({
  isOpen: () => props.isOpen,
});

function onClose() {
  emit("close");
}
</script>

<style scoped>
/* The panel fill + gradient border come from the shared `.modal-body-fill` /
   `.modal-gradient-border` classes in main.css (also used by the withdrawal +
   signup modals). Only the deposit-specific scrollbar lives here. */

.deposit-modal-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.deposit-modal-scrollbar::-webkit-scrollbar-track {
  background: #2a2a2a;
  border-radius: 4px;
}

.deposit-modal-scrollbar::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 4px;
}

.deposit-modal-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}

/* "modal" transition is defined globally in app/assets/css/main.css. */
</style>
