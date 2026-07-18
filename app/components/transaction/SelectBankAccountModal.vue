<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
        @click.self="onClose">
        <div class="w-full md:min-w-[459px] md:max-w-[459px] relative px-4 md:px-0">
          <!-- Close Button - Floating at top -->
          <div
            class="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 flex items-center justify-center absolute -top-15 -right-3 z-10">
            <button class="transition-colors cursor-pointer" aria-label="Close" @click="onClose">
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

          <!-- Modal Content Box -->
          <div class="bg-white rounded-2xl max-h-[80dvh] overflow-hidden w-full" style="
              border: 2px solid #e0e0e0;
              font-family: var(--font-line-seed);
            ">
            <!-- Header -->
            <div
              class="flex-shrink-0 px-4 md:pl-[32px] md:pr-6 py-3 md:pt-4 md:pb-1 flex items-center justify-start relative">
              <h2 class="text-[#212121] text-[16px] font-bold lg:text-[17px]"
                style="font-family: var(--font-line-seed)">
                {{ headerTitle }}
              </h2>
            </div>

            <!-- Bank Accounts List -->
            <div class="pl-[32px] pr-6 pb-6 overflow-y-auto max-h-[calc(80dvh-120px)]">
              <div v-if="bankAccounts.length === 0" class="flex flex-col items-center justify-center py-12 px-4">
                <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="text-[#8E8E8E] text-sm lg:text-base font-normal" style="font-family: var(--font-line-seed)">
                  No data found
                </p>
              </div>

              <div v-else class="flex flex-col gap-1">
                <button v-for="account in bankAccounts" :key="account.id"
                  class="h-[60px] cursor-pointer flex items-center justify-start gap-1 transition-all hover:scale-105 group"
                  @click="handleSelect(account)">
                  <div class="w-full md:w-[400.53px] h-[60px] flex items-center flex-shrink-0 rounded-[16px] relative"
                    :style="`background-image: url(${siteConfig.assets.transaction.bankAccountNoImage}); background-size: contain; background-position: center; background-repeat: no-repeat`">
                    <div class="w-1/2 flex items-center justify-center px-4">
                      <NuxtImg
                        :src="`${siteConfig.assets.transaction.bankAccountListPath}/${account.bank?.replace(/\s+/g, '')}.png`"
                        :alt="account.bank" style="
                          max-width: 85%;
                          max-height: 26px;
                          width: auto;
                          object-fit: contain;
                        " />
                    </div>
                    <div class="w-1/2 flex items-center justify-center px-4">
                      <span class="text-gray-700 font-normal text-sm">{{
                        account.bank
                      }}</span>
                    </div>
                  </div>
                  <!-- <span className="text-black">{{ siteConfig.assets.transaction.bankAccountListPath }}</span> -->
                  <!-- Bank Logo -->
                  <!-- <img
                    v-if="!failedImages.has(account.id)"
                    :src="`${siteConfig.assets.transaction.bankAccountListPath}/${paymentType}/${account.bank?.replace(/\s+/g, '')}.png`"
                    :alt="account.bank"
                    class="object-contain flex-shrink-0 h-[60px] w-full md:w-[400.53px]"
                    @error="handleImageError(account.id)"
                   loading="lazy" decoding="async"/>
                  <div
                    v-else
                    class="w-full md:w-[400.53px] h-[60px] flex items-center flex-shrink-0 rounded-[16px]"
                    :style="`background-image: url(${siteConfig.assets.transaction.bankAccountNoImage}); background-size: contain; background-position: center; background-repeat: no-repeat`"
                  >
                    <div class="w-1/2 flex items-center justify-center">
                      <svg class="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    </div>
                    <div class="w-1/2 flex items-center justify-start px-4">
                      <span class="text-gray-700 font-normal text-sm">{{ account.bank }}</span>
                    </div>
                  </div> -->
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface IBankAccount {
  id: string;
  account_name: string;
  bank: string;
  code: string;
  account_number: string;
  credit_fee_type: string;
  credit_fee: string;
}

const props = defineProps<{
  isOpen: boolean;
  bankAccounts: IBankAccount[];
  selectedBankId?: string;
  paymentType?: string;
}>();

const emit = defineEmits<{
  close: [];
  select: [bankAccount: IBankAccount];
}>();

const siteConfig = useSiteConfig();
const { t } = useI18n();
const failedImages = ref<Set<string>>(new Set());

const headerTitle = computed(() => {
  if (props.paymentType === "BANK") return t("deposit.accountList.bank");
  if (props.paymentType === "E-MONEY") return t("deposit.accountList.emoney");
  if (props.paymentType === "PULSA") return t("deposit.accountList.pulsa");
  return "";
});

function _handleImageError(bankId: string) {
  failedImages.value = new Set([...failedImages.value, bankId]);
}

function handleSelect(bankAccount: IBankAccount) {
  emit("select", bankAccount);
  emit("close");
}

function onClose() {
  emit("close");
}
</script>
