<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-2 md:p-4"
        @click.self="onClose">
        <div
          class="tm-dialog-shell relative w-full md:max-h-[calc(100dvh-2rem)] xl:max-h-[calc(100vh-2rem)] flex flex-col md:min-w-[480px] md:max-w-[480px]"
          role="dialog" :aria-label="t('deposit.title')">
          <!-- Header -->
          <DepositModalHeader @close="onClose" />

          <div class="tm-modal modal-body-fill modal-gradient-border rounded-[18px] flex flex-col flex-1 min-h-0 overflow-hidden"
            :style="borderStyle">
            <!-- Scrollable Content -->
            <div
              class="modal-body-fill flex-1 overflow-y-auto deposit-modal-scrollbar rounded-xl min-h-0 mt-3 md:mt-4 mb-3 md:mb-4"
              :style="{ '--body-bg': dep.modalBgColor }" style="scrollbar-width: thin; scrollbar-color: #4a4a4a #2a2a2a">
              <div class="px-4 md:px-6 lg:px-10 py-5">
                <!-- Bank transfer is the only deposit method. -->
                <BankPaymentContent :bank-accounts="bankAccounts" />

                <!-- Deposit History Table. Shown at every width: it was
                     `hidden md:block`, so a phone had no way to check whether
                     the deposit just submitted had been credited - the one
                     question the form leaves you with. The withdrawal modal
                     already showed its history on mobile, so this also puts
                     the two money modals back in step. -->
                <div class="block">
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

// Kept async so the deposit form isn't fetched until the modal opens.
const BankPaymentContent = defineAsyncComponent(
  () => import("@/components/transaction/BankPaymentContent.vue"),
);

const siteConfig = useSiteConfig();
const dep = computed(() => siteConfig.theme.transactionmodal);

// Panel border + input theming — the shared bundle every themed surface uses
// (`.modal-gradient-border` / `.tm-modal` in main.css), so deposit, withdrawal
// and the account panels cannot drift apart. The gradient glows in the center
// and fades at the corners.
const borderStyle = useModalTheme();

// `isOpen` is read directly by the template; nothing in the script needs the
// props object now that useDepositModal() no longer watches it.
defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const { bankAccounts, historyMethod } = useDepositModal();

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
