<template>
  <div class="flex items-start justify-center p-0 mt-10">
    <div class="w-full max-w-2xl px-2 pb-2">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <!-- Old Password -->
        <div class="mb-4">
          <label class="block text-sm text-white mb-2 font-medium">
            {{ t("password.CurrentPassword") }}
          </label>
          <div class="relative">
            <input
              v-model="oldPasswordField" :type="showOldPassword ? 'text' : 'password'" :disabled="isSubmitting"
              :class="[
                'w-full px-4 py-2 pr-10 bg-white text-gray-800 rounded-[4px] border-2 border-transparent outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-500',
                errors.oldPassword ? 'border-red-500' : 'focus:border-blue-500',
              ]" :aria-label="t('password.CurrentPassword')">
            <button
              type="button" :disabled="isSubmitting"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition-colors"
              @click="showOldPassword = !showOldPassword">
              <svg
                v-if="showOldPassword" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg
                v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          <p v-if="errors.oldPassword" class="text-red-500 text-xs mt-1 font-medium">
            {{ errors.oldPassword }}
          </p>
        </div>

        <!-- New Password -->
        <div class="mb-4">
          <label class="block text-sm text-white mb-2 font-medium">
            {{ t("password.newPassword") }}
          </label>
          <div class="relative">
            <input
              v-model="newPasswordField" :type="showNewPassword ? 'text' : 'password'" :disabled="isSubmitting"
              :class="[
                'w-full px-4 py-2 pr-10 bg-white text-gray-800 rounded-[4px] border-2 border-transparent outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-500',
                errors.newPassword ? 'border-red-500' : 'focus:border-blue-500',
              ]" :aria-label="t('password.newPassword')">
            <button
              type="button" :disabled="isSubmitting"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition-colors"
              @click="showNewPassword = !showNewPassword">
              <svg
                v-if="showNewPassword" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg
                v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          <p v-if="errors.newPassword" class="text-red-500 text-xs mt-1 font-medium">
            {{ errors.newPassword }}
          </p>
        </div>

        <!-- Confirm Password -->
        <div class="mb-4">
          <label class="block text-sm text-white mb-2 font-medium">
            {{ t("password.confirmPassword") }}
          </label>
          <div class="relative">
            <input
              v-model="confirmPasswordField" :type="showConfirmPassword ? 'text' : 'password'"
              :disabled="isSubmitting" :class="[
                'w-full px-4 py-2 pr-10 bg-white text-gray-800 rounded-[4px] border-2 border-transparent outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-500',
                errors.confirmPassword
                  ? 'border-red-500'
                  : 'focus:border-blue-500',
              ]" :aria-label="t('password.confirmPassword')">
            <button
              type="button" :disabled="isSubmitting"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition-colors"
              @click="showConfirmPassword = !showConfirmPassword">
              <svg
                v-if="showConfirmPassword" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg
                v-else class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          <p v-if="errors.confirmPassword" class="text-red-500 text-xs mt-1 font-medium">
            {{ errors.confirmPassword }}
          </p>
        </div>

        <!-- Submit Button -->
        <div class="relative mb-[50px] mt-[45px]">
          <button
            type="submit" :disabled="isSubmitting"
            class="w-full text-lg lg:text-xl font-semibold bg-[#FFE100] hover:bg-[#e6cc00] disabled:opacity-60 disabled:cursor-not-allowed text-black py-3 lg:py-4 rounded-[4px] transition-all hover:scale-[1.02] active:scale-95">
            {{
              isSubmitting
                ? t("password.updatingButton")
                : t("password.updateButton")
            }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useForm } from "vee-validate";
import { useApi } from "@/composables/useApi";
import { changePasswordSchema } from "@/schemas";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";

/** Error shape carried by an ofetch/$fetch error. */
interface FetchErrorLike {
  data?: { message?: string };
  message?: string;
}

const { t, locale } = useI18n();

const emit = defineEmits<{
  "password-changed": [];
}>();

// VeeValidate form — reactive schema so the (baked) validation messages follow
// the active locale instead of freezing to the first language.
const { handleSubmit, errors, defineField, resetForm } = useForm({
  validationSchema: computed(() => {
    void locale.value;
    return changePasswordSchema(t);
  }),
});

const [oldPasswordField] = defineField("oldPassword");
const [newPasswordField] = defineField("newPassword");
const [confirmPasswordField] = defineField("confirmPassword");

// UI state
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const isSubmitting = ref(false);

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true;
  try {
    const api = useApi();
    await api("/auth/change-password", {
      method: "POST",
      body: {
        currentPassword: values.oldPassword,
        newPassword: values.newPassword,
      },
    });

    // Reset form
    resetForm();
    showOldPassword.value = false;
    showNewPassword.value = false;
    showConfirmPassword.value = false;

    emit("password-changed");
    await showSuccessAlert(
      t("password.success.title"),
      t("password.success.message"),
    );
  } catch (err: unknown) {
    const e = err as FetchErrorLike;
    const errorMessage =
      e?.data?.message || e?.message || t("password.error.generic");
    await showErrorAlert(t("password.error.title"), errorMessage);
  } finally {
    isSubmitting.value = false;
  }
});
</script>
