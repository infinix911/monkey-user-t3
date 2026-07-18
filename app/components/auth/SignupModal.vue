<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-3 pb-3 sm:px-4 sm:pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
        @click.self="handleBackdropClick">
        <!-- Shared modal frame (same gradient border as deposit/withdraw).
             modalVars sits here so the accent vars also reach the close button. -->
        <div class="relative w-full max-w-[440px]" :style="modalVars">
          <!-- Card — shared transaction-modal border + fill + input theming -->
          <form
            class="tm-modal modal-body-fill modal-gradient-border rounded-[18px] flex max-h-[98dvh] flex-col overflow-hidden"
            @submit.prevent="onSubmit">
            <!-- Logo header — px-14 reserves space so a wide wordmark logo
                 never slides under the top-right close button. Symmetric
                 vertical padding (py-5) keeps the logo optically centred in the
                 header, so the close button — centred to the header below — lines
                 up with the logo's centre on both desktop and mobile. -->
            <div class="relative flex flex-shrink-0 flex-col items-center px-14 py-3">
              <!-- Close button — centred on the logo via top-1/2 + -translate-y-1/2
                   (no magic offsets); the header padding is symmetric so the
                   header centre equals the logo centre. -->
              <button
                type="button"
                class="signup-close absolute right-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer"
                :aria-label="$t('common.close')" @click="handleClose">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <NuxtImg
                :src="logoSrc" :alt="siteConfig.identity.siteName"
                class="h-[40px] w-auto max-w-full object-contain drop-shadow-[0_2px_10px_rgba(255,122,0,0.45)]"
                height="40" loading="eager" />
            </div>

            <!-- Scrollable body -->
            <div class="signup-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-2">
              <!-- Title row -->
              <div class="flex items-center gap-3">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.75 20a7.25 7.25 0 0 1 14.5 0" />
                  </svg>
                </span>
                <div class="min-w-0">
                  <h2 class="text-[22px] font-bold leading-tight text-white">
                    {{ $t("signup.title") }}
                  </h2>
                  <p class="text-[13px] leading-tight text-[#9a9a9a]">
                    {{ $t("signup.subtitle") }}
                  </p>
                </div>
              </div>

              <!-- Username -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <circle cx="8.5" cy="11" r="2" />
                    <path d="M5.75 15.5c.4-1.2 1.4-1.9 2.75-1.9s2.35.7 2.75 1.9M14 10h4M14 13.5h2.5" />
                  </svg>
                </span>
                <div class="field-main">
                  <FormField
                    v-model="usernameField" :label="$t('signup.id')" :placeholder="$t('signup.enterId')"
                    :error="errors.username" required @blur="checkUsername">
                    <template #suffix>
                      <button
                        type="button"
                        :disabled="!(usernameField ?? '').trim() || isCheckingUsername"
                        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-colors"
                        :class="!(usernameField ?? '').trim() || isCheckingUsername
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'tm-accent-btn cursor-pointer'"
                        :aria-label="$t('common.search')" @click="checkUsername">
                        <svg v-if="isCheckingUsername" class="h-4 w-4 animate-spin rounded-full border-2" :style="{ borderColor: 'var(--tm-accent)', borderTopColor: 'transparent' }" />
                        <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </template>
                    <template #hint>
                      <p v-if="usernameStatus === 'available'" class="mt-1 flex items-center gap-1 text-xs text-green-500">
                        {{ $t("signup.idAvailable") }}
                      </p>
                      <p v-if="usernameStatus === 'taken'" class="mt-1 flex items-center gap-1 text-xs text-[#FF5A3C]">
                        {{ $t("signup.idTaken") }}
                      </p>
                    </template>
                  </FormField>
                </div>
              </div>

              <!-- Password -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <div class="field-main">
                  <FormField
                    v-model="passwordField" :type="showPassword ? 'text' : 'password'"
                    :label="$t('signup.password')" :error="errors.password" required>
                    <template #suffix>
                      <button
                        type="button"
                        class="tm-toggle absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                        @click="showPassword = !showPassword">
                        <svg v-if="showPassword" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      </button>
                    </template>
                  </FormField>
                </div>
              </div>

              <!-- Confirm Password -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <div class="field-main">
                  <FormField
                    v-model="confirmPasswordField" :type="showConfirmPassword ? 'text' : 'password'"
                    :label="$t('signup.verifyPassword')" :error="errors.confirmPassword" required>
                    <template #suffix>
                      <button
                        type="button"
                        class="tm-toggle absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                        @click="showConfirmPassword = !showConfirmPassword">
                        <svg v-if="showConfirmPassword" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      </button>
                    </template>
                  </FormField>
                </div>
              </div>

              <!-- Mobile Number -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293a.75.75 0 0 1-.91.265 12.035 12.035 0 0 1-6.04-6.04.75.75 0 0 1 .265-.91l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102A1.125 1.125 0 0 0 5.872 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </span>
                <div class="field-main">
                  <FormField
                    v-model="mobileField" type="tel" :label="$t('signup.mobileNumber')"
                    :placeholder="$t('signup.phonePlaceholder')" :error="errors.mobile" required />
                </div>
              </div>

              <!-- Email -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <path d="M4 7.5l8 5.5 8-5.5" />
                  </svg>
                </span>
                <div class="field-main">
                  <FormField
                    v-model="emailField" type="email" :label="$t('signup.email')"
                    :placeholder="$t('signup.emailPlaceholder')" :error="errors.email" required />
                </div>
              </div>

              <!-- Section divider: Bank Information -->
              <div class="sect-divider">
                <span>{{ $t("signup.bankInformation") }}</span>
              </div>

              <!-- Currency -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M14.5 9.3c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.6.8-2.6 2s1 1.8 2.6 2.1 2.6.9 2.6 2.1-1.1 2-2.6 2c-1 0-2-.5-2.5-1.5M12 6.3v11.4" />
                  </svg>
                </span>
                <div class="field-main">
                  <label class="mb-1 block text-[13px] font-bold leading-tight text-white">
                    {{ $t("signup.currency") }} <span class="text-[#FF5A3C]">*</span>
                  </label>
                  <div
                    class="flex h-[42px] w-full cursor-not-allowed items-center gap-2 rounded-[8px] border px-3 opacity-95"
                    :style="{ backgroundColor: 'var(--tm-input-bg)', borderColor: 'var(--tm-input-border)', color: 'var(--tm-input-text)' }">
                    <LanguageFlag :code="selectedCurrencyFlag" class="h-4 w-6 shrink-0 overflow-hidden rounded-sm" />
                    <span class="truncate text-[14px]">{{ selectedCurrencyLabel }}</span>
                    <svg class="ml-auto h-4 w-4" :style="{ color: 'var(--tm-accent)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span v-if="errors.currency" class="mt-1 block text-xs text-[#FF5A3C]">{{ errors.currency }}</span>
                </div>
              </div>

              <!-- Bank Name -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9.5 12 4l9 5.5M4.75 9.5V18M9 9.5V18M15 9.5V18M19.25 9.5V18M3 20.5h18" />
                  </svg>
                </span>
                <div class="field-main">
                  <label class="mb-1 block text-[13px] font-bold leading-tight text-white">
                    {{ $t("signup.bankName") }} <span class="text-[#FF5A3C]">*</span>
                  </label>
                  <div class="relative">
                    <select
                      v-model="bankNameField"
                      class="h-[42px] w-full appearance-none rounded-[8px] border px-3 pr-10 text-[16px] md:text-[14px] transition-colors focus:outline-none"
                      :style="{
                        backgroundColor: 'var(--tm-input-bg)',
                        borderColor: errors.bankName ? '#FF5A3C' : 'var(--tm-input-border)',
                        color: bankNameField ? 'var(--tm-input-text)' : 'var(--tm-input-ph)',
                        fontFamily: 'var(--font-line-seed)',
                      }">
                      <option value="" :style="{ backgroundColor: 'var(--tm-input-bg)', color: 'var(--tm-input-ph)' }">{{ $t("signup.selectBank") }}</option>
                      <option v-for="bank in bankNames" :key="bank" :value="bank" :style="{ backgroundColor: 'var(--tm-input-bg)', color: 'var(--tm-input-text)' }">
                        {{ bank }}
                      </option>
                    </select>
                    <svg class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2" :style="{ color: 'var(--tm-accent)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span v-if="errors.bankName" class="mt-1 block text-xs text-[#FF5A3C]">{{ errors.bankName }}</span>
                </div>
              </div>

              <!-- Account Name -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.75 20a7.25 7.25 0 0 1 14.5 0" />
                  </svg>
                </span>
                <div class="field-main">
                  <FormField
                    v-model="bankAccountNameField" :label="$t('signup.accountName')"
                    :placeholder="$t('signup.accountNamePlaceholder')" :error="errors.bankAccountName" required />
                </div>
              </div>

              <!-- Account Number — digits only (schema enforces too).
                   type="tel" gives the numeric keyboard on mobile. -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                    <path d="M2.5 9.5h19M6 15h4" />
                  </svg>
                </span>
                <div class="field-main">
                  <FormField
                    v-model="bankAccountField" :label="$t('signup.accountNumber')"
                    :placeholder="$t('signup.accountNumberPlaceholder')" :error="errors.bankAccount"
                    type="tel" required />
                </div>
              </div>

              <!-- Section divider: Referral (Optional) -->
              <div class="sect-divider">
                <span>{{ $t("signup.referralSection") }}</span>
              </div>

              <!-- Referral Code -->
              <div class="field-row">
                <span class="octa" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3.5" y="8.5" width="17" height="4.5" rx="1" />
                    <path d="M5.25 13v7.5h13.5V13M12 8.5v12M12 8.5S11 4.5 8.6 4.5 6.4 7.2 7.4 8s4.6.5 4.6.5ZM12 8.5s1-4 3.4-4 2.2 2.7 1.2 3.5-4.6.5-4.6.5Z" />
                  </svg>
                </span>
                <div class="field-main">
                  <FormField
                    v-model="referralField" :label="$t('signup.referral')"
                    :placeholder="$t('signup.referralPlaceholder')" :error="errors.referral" @blur="checkReferral">
                    <template #suffix>
                      <button
                        type="button"
                        :disabled="!(referralField ?? '').trim() || isCheckingReferral"
                        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-colors"
                        :class="!(referralField ?? '').trim() || isCheckingReferral
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'tm-accent-btn cursor-pointer'"
                        aria-label="Check referral" @click="checkReferral">
                        <svg v-if="isCheckingReferral" class="h-4 w-4 animate-spin rounded-full border-2" :style="{ borderColor: 'var(--tm-accent)', borderTopColor: 'transparent' }" />
                        <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </template>
                    <template #hint>
                      <p v-if="referralStatus === 'valid'" class="mt-1 flex items-center gap-1 text-xs text-green-500">
                        {{ $t("signup.referralValid") }}
                      </p>
                      <p v-if="referralStatus === 'invalid'" class="mt-1 flex items-center gap-1 text-xs text-[#FF5A3C]">
                        {{ $t("signup.referralNotFound") }}
                      </p>
                    </template>
                  </FormField>
                </div>
              </div>
            </div>

            <!-- Footer: submit CTA. Bottom padding adds the iOS safe-area inset
                 so the CTA clears the home indicator and never sits under the
                 fixed bottom nav on iPhone. -->
            <div class="flex-shrink-0 px-5 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                type="submit" :disabled="isSubmitting"
                class="daftar-btn flex w-full items-center justify-center uppercase">
                <span class="daftar-btn__label">{{ isSubmitting ? $t("common.loading") : $t("signup.daftarNow") }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useSignupForm } from "@/components/auth/useSignupForm";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const siteConfig = useSiteConfig();

// Dedicated signup-modal theme (theme.signupModal) — border, inputs and
// primary-button gradient. Kept separate from the deposit/withdraw modals so
// the signup screen can be re-skinned on its own from the CMS.
const dep = computed(() => siteConfig.theme.signupModal);

// CSS vars consumed by the shared `.modal-gradient-border` / `.tm-modal`
// rules in main.css and by the inputs/select below.
const modalVars = computed(() => ({
  // shared gradient border
  "--body-bg": dep.value.modalBgColor,
  "--b-mid": dep.value.borderColor,
  "--b-accent": dep.value.accentColor,
  // shared input theming
  "--tm-input-bg": dep.value.inputBgColor,
  "--tm-input-border": dep.value.inputBorderColor,
  "--tm-input-text": dep.value.inputTextColor,
  "--tm-input-ph": dep.value.inputPlaceholderColor,
  "--tm-accent": dep.value.accentColor,
  // primary (Daftar) button gradient — reuses the existing key
  "--tm-btn-grad": dep.value.buttonGradientColor,
  "font-family": "var(--font-line-seed)",
}));

const logoSrc = computed(
  () => siteConfig.identity.logoPopup || siteConfig.identity.logo,
);

const handleClose = () => {
  emit("close");
};

const handleBackdropClick = () => {
  handleClose();
};

const {
  bankNames,
  errors,
  usernameField,
  passwordField,
  confirmPasswordField,
  emailField,
  mobileField,
  bankNameField,
  bankAccountNameField,
  bankAccountField,
  referralField,
  isSubmitting,
  isCheckingUsername,
  isCheckingReferral,
  showPassword,
  showConfirmPassword,
  usernameStatus,
  referralStatus,
  selectedCurrencyFlag,
  selectedCurrencyLabel,
  checkUsername,
  checkReferral,
  onSubmit,
} = useSignupForm({
  isOpen: () => props.isOpen,
  onClose: handleClose,
});
</script>

<style scoped>
/* The card frame (gradient border + fill) now comes from the shared
   `.modal-gradient-border` / `.modal-body-fill` classes in main.css — the same
   border the deposit and withdrawal modals use. */

.signup-close {
  color: var(--tm-accent);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid color-mix(in srgb, var(--tm-accent) 55%, transparent);
}
.signup-close:hover {
  color: color-mix(in srgb, var(--tm-accent) 70%, #fff);
}

/* Accent helpers — every orange in the signup modal derives from --tm-accent
   (= transactionmodal.accentColor), so there is one accent source of truth. */
.tm-accent {
  color: var(--tm-accent);
}
.tm-accent-btn {
  color: var(--tm-accent);
}
.tm-accent-btn:hover {
  color: color-mix(in srgb, var(--tm-accent) 72%, #fff);
}
.tm-toggle {
  color: #9a9a9a;
}
.tm-toggle:hover {
  color: var(--tm-accent);
}

/* Field rows: octagon icon beside the (label + input) block. */
.field-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
.field-main {
  flex: 1 1 auto;
  min-width: 0;
}

/* Octagonal icon badge: orange ring, dark interior, orange glyph. */
.octa {
  position: relative;
  flex: none;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  clip-path: polygon(
    29% 0,
    71% 0,
    100% 29%,
    100% 71%,
    71% 100%,
    29% 100%,
    0 71%,
    0 29%
  );
  /* Ring: light/mid/dark stops derived from the shared accentColor. */
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--tm-accent) 62%, #fff) 0%,
    var(--tm-accent) 46%,
    color-mix(in srgb, var(--tm-accent) 58%, #000) 100%
  );
}
.octa::before {
  content: "";
  position: absolute;
  inset: 2.5px;
  clip-path: inherit;
  background: radial-gradient(
    120% 120% at 50% 0%,
    color-mix(in srgb, var(--tm-accent) 20%, #000) 0%,
    #0b0603 72%
  );
}
.octa > svg {
  position: relative;
  z-index: 1;
  width: 18px;
  height: 18px;
  color: color-mix(in srgb, var(--tm-accent) 82%, #fff);
}

/* Section divider with centered orange label and fading rules. */
.sect-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 2px;
}
.sect-divider::before,
.sect-divider::after {
  content: "";
  flex: 1;
  height: 1px;
}
.sect-divider::before {
  background: linear-gradient(to right, transparent, var(--tm-accent));
}
.sect-divider::after {
  background: linear-gradient(to left, transparent, var(--tm-accent));
}
.sect-divider > span {
  white-space: nowrap;
  color: color-mix(in srgb, var(--tm-accent) 88%, #fff);
  font-weight: 700;
  letter-spacing: 0.16em;
  font-size: 13px;
  text-transform: uppercase;
}

/* Primary action button: layered hexagonal badge —
   bright glowing rim → dark inner outline → gold gradient face. */
.daftar-btn {
  position: relative;
  height: 56px;
  /* shared elongated-hexagon silhouette, reused by both pseudo layers */
  --daftar-clip: polygon(
    5% 0,
    95% 0,
    100% 28%,
    100% 72%,
    95% 100%,
    5% 100%,
    0 72%,
    0 28%
  );
  clip-path: var(--daftar-clip);
  /* outer layer = bright glowing rim */
  background: linear-gradient(180deg, #ffd86b 0%, #ff8a14 55%, #ff7000 100%);
  box-shadow:
    0 0 24px rgba(255, 140, 0, 0.6),
    0 0 56px rgba(255, 90, 0, 0.28);
  transition:
    transform 0.12s ease,
    filter 0.12s ease;
}
/* dark inner outline */
.daftar-btn::before {
  content: "";
  position: absolute;
  inset: 3px;
  clip-path: var(--daftar-clip);
  background: #2a1404;
}
/* gold gradient face — reuses transactionmodal.buttonGradientColor */
.daftar-btn::after {
  content: "";
  position: absolute;
  inset: 5px;
  clip-path: var(--daftar-clip);
  background: var(--tm-btn-grad);
  box-shadow:
    inset 0 2px 2px rgba(255, 255, 255, 0.55),
    inset 0 -4px 8px rgba(150, 50, 0, 0.55);
}
.daftar-btn__label {
  position: relative;
  z-index: 1;
  color: #3a1d00;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}
.daftar-btn:hover:not(:disabled) {
  filter: brightness(1.06);
}
.daftar-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.99);
  filter: brightness(0.98);
}
.daftar-btn:disabled {
  cursor: not-allowed;
  filter: grayscale(0.4) brightness(0.7);
}

/* Slim themed scrollbar for the body. */
.signup-scroll::-webkit-scrollbar {
  width: 6px;
}
.signup-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.signup-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 122, 0, 0.45);
  border-radius: 999px;
}
.signup-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 122, 0, 0.7);
}

/* Modal open/close transition ("modal") is defined globally in
   app/assets/css/main.css so every modal shares the same fade + scale. */
</style>
