<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-2 md:p-4"
        @click.self="onClose">
        <div class="tm-dialog-shell relative w-full flex flex-col md:min-w-[480px] md:max-w-[480px]"
          role="dialog" :aria-label="$t('withdrawal.title')">
          <!-- Header — min-h matches the title image height (h-11/md:h-15) so the
               header keeps its size and the close button stays centred even when
               the image is hidden (showWithdrawalImageTitle = false). -->
          <div class="flex-shrink-0 px-4 md:px-6 pt-3 min-h-11 md:min-h-15 flex items-center justify-center relative bg-transparent">
            <!-- Title wordmark image (shown when the brand opts in via
                 deposit.showWithdrawalImageTitle). -->
            <img v-if="dep.showWithdrawalImageTitle" :src="siteConfig.assets.transaction.withdrawIcon"
              alt="Withdraw" class="h-11 md:h-15 w-auto object-contain select-none pointer-events-none" />
            <button type="button"
              class="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
              :aria-label="$t('common.close')" @click="onClose">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 26 26" fill="none"
                class="md:w-[26px] md:h-[26px]">
                <line x1="1.44191" y1="1.01958" x2="24.9799" y2="24.5575" stroke="#939393" stroke-width="2.03917"
                  stroke-linecap="round" />
                <line x1="1.01959" y1="-1.01959" x2="34.3073" y2="-1.01959"
                  transform="matrix(-0.707107 0.707107 0.707107 0.707107 26 1.01959)" stroke="#939393"
                  stroke-width="2.03917" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <!-- Below `md` the panel is `flex-1 min-h-0`, exactly as the deposit
               modal sizes its body, so the two fill the phone screen
               identically. It used to be a flat `h-[calc(100dvh-100px)]`, which
               assumed a 100px header; the header actually measures 56px, so the
               panel stopped 44px short of the bottom and this modal sat visibly
               shorter than the deposit one on the same phone. From `md` the old
               fixed height is kept, where the dialog is `h-auto` and flex-1
               would collapse it to its content. -->
          <div
            class="tm-modal modal-body-fill modal-gradient-border rounded-[18px] flex flex-1 min-h-0 flex-col overflow-hidden md:flex-none md:h-[calc(100dvh-100px)]"
            :style="borderStyle">
            <div class="h-full overflow-y-scroll withdrawal-modal-scrollbar">
              <WithdrawalContent :on-success="onClose" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const siteConfig = useSiteConfig();
const dep = computed(() => siteConfig.theme.transactionmodal);

// Panel border + input theming — the shared bundle every themed surface uses
// (`.modal-gradient-border` / `.tm-modal` in main.css).
const borderStyle = useModalTheme();

const _props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

function onClose() {
  emit("close");
}

</script>

<style scoped>
/* The panel fill + gradient border come from the shared `.modal-body-fill` /
   `.modal-gradient-border` classes in main.css (also used by the deposit +
   signup modals). Only the withdrawal scrollbar lives here. */

.withdrawal-modal-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #4a4a4a #2a2a2a;
}

.withdrawal-modal-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.withdrawal-modal-scrollbar::-webkit-scrollbar-track {
  background: #2a2a2a;
  border-radius: 4px;
}

.withdrawal-modal-scrollbar::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 4px;
}

.withdrawal-modal-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
