<template>
  <!-- Body width tracks the withdrawal and deposit panels (max-w-md, centred,
       same gutters) so every transaction-style panel in the account modal lines
       up instead of this one running full width. -->
  <div class="flex items-start justify-center p-0">
    <div class="w-full max-w-md mx-auto px-3 md:px-5 pt-5 pb-4 md:py-6">
      <!-- Tabs. The two credentials are independent, so they get their own form
           and their own submit rather than one screen that changes both: a
           failure on either must never half-apply the other. -->
      <div class="flex gap-1 border-b tm-line mb-6" role="tablist">
        <button
          v-for="tab in TABS" :key="tab.id" type="button" role="tab"
          :aria-selected="activeTab === tab.id"
          class="pw-tab flex-1 px-4 py-3 text-sm md:text-base font-medium cursor-pointer transition-colors"
          :class="activeTab === tab.id ? 'is-active' : 'tm-muted hover:text-white'"
          @click="activeTab = tab.id">
          {{ t(tab.labelKey) }}
        </button>
      </div>

      <!-- Login password -->
      <form v-show="activeTab === 'login'" class="space-y-4" @submit.prevent="onSubmit">
        <PasswordField
          v-model="oldPasswordField" :label="t('password.CurrentPassword')" :error="errors.oldPassword"
          :disabled="isSubmitting" autocomplete="current-password" />
        <PasswordField
          v-model="newPasswordField" :label="t('password.newPassword')" :error="errors.newPassword"
          :disabled="isSubmitting" autocomplete="new-password" />
        <PasswordField
          v-model="confirmPasswordField" :label="t('password.confirmPassword')" :error="errors.confirmPassword"
          :disabled="isSubmitting" autocomplete="new-password" />

        <div class="relative mt-6 mb-4">
          <button
            type="submit" :disabled="isSubmitting"
            class="tm-btn w-full text-lg lg:text-xl font-semibold py-3 lg:py-4 rounded-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer">
            {{ isSubmitting ? t("password.updatingButton") : t("password.updateButton") }}
          </button>
        </div>
      </form>

      <!-- Withdrawal password -->
      <form v-show="activeTab === 'withdrawal'" class="space-y-4" @submit.prevent="onSubmitWithdrawal">
        <p class="tm-muted text-xs mb-4">{{ t("password.withdrawalHint") }}</p>

        <!-- The current password is sent and verified server-side against the
             stored hash before the new one is written, so a live session alone
             cannot rotate the credential that guards withdrawals.
             Left blank it still submits: the same endpoint doubles as first-time
             setup, and a member who has never set a withdrawal password has
             nothing to enter. The server skips the check only in that case. -->
        <PasswordField
          v-model="wdCurrentField" :label="t('password.currentWithdrawalPassword')"
          :error="wdErrors.currentPassword" :disabled="wdSubmitting" autocomplete="current-password" />
        <PasswordField
          v-model="wdNewField" :label="t('password.newWithdrawalPassword')" :error="wdErrors.newPassword"
          :disabled="wdSubmitting" autocomplete="new-password" />
        <PasswordField
          v-model="wdConfirmField" :label="t('password.confirmWithdrawalPassword')" :error="wdErrors.confirmPassword"
          :disabled="wdSubmitting" autocomplete="new-password" />

        <div class="relative mt-6 mb-4">
          <button
            type="submit" :disabled="wdSubmitting"
            class="tm-btn w-full text-lg lg:text-xl font-semibold py-3 lg:py-4 rounded-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer">
            {{ wdSubmitting ? t("password.updatingButton") : t("password.updateButton") }}
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
import { changePasswordSchema, withdrawalPasswordSchema } from "@/schemas";
import PasswordField from "@/components/my-account/PasswordField.vue";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";
import { useApiMessage } from "@/composables/useApiMessage";

// The ofetch error shape no longer needs a local interface: apiMessage()
// resolves both backend response shapes itself.

const { t, locale } = useI18n();
// Backend errors arrive as UPPER_SNAKE tokens (INVALID_CURRENT_PASSWORD, …).
// password.apiMessages already carries all of them in both locales.
const apiMessage = useApiMessage();

const emit = defineEmits<{
  "password-changed": [];
}>();

const TABS = [
  { id: "login", labelKey: "password.tabs.login" },
  { id: "withdrawal", labelKey: "password.tabs.withdrawal" },
] as const;

type TabId = (typeof TABS)[number]["id"];
const activeTab = ref<TabId>("login");

// ── Login password ──────────────────────────────────────────────────────────
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

    resetForm();
    emit("password-changed");
    await showSuccessAlert(
      t("password.success.title"),
      t("password.success.message"),
    );
  } catch (err: unknown) {
    // Was `e?.data?.message` — the raw token, shown verbatim to the member.
    await showErrorAlert(
      t("password.error.title"),
      apiMessage(err, "password", "password.error.generic"),
    );
  } finally {
    isSubmitting.value = false;
  }
});

// ── Withdrawal password ─────────────────────────────────────────────────────
// Its own form and submit: a failure here must not leave the login-password
// change half-applied, or the reverse.
//
// The endpoint takes `currentPassword` (optional) + `newPassword`. Confirm is
// checked here and never sent — it exists so a typo cannot silently become the
// credential that guards withdrawals. Current IS sent, and the server verifies
// it against the stored hash whenever one exists.
const WITHDRAWAL_PASSWORD_ENDPOINT = "/auth/change-withdrawal-password";

const {
  handleSubmit: wdHandleSubmit,
  errors: wdErrors,
  defineField: wdDefineField,
  resetForm: wdResetForm,
} = useForm({
  validationSchema: computed(() => {
    void locale.value;
    return withdrawalPasswordSchema(t);
  }),
});

const [wdCurrentField] = wdDefineField("currentPassword");
const [wdNewField] = wdDefineField("newPassword");
const [wdConfirmField] = wdDefineField("confirmPassword");

const wdSubmitting = ref(false);

const onSubmitWithdrawal = wdHandleSubmit(async (values) => {
  wdSubmitting.value = true;
  try {
    const api = useApi();
    await api(WITHDRAWAL_PASSWORD_ENDPOINT, {
      method: "POST",
      body: {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
    });

    wdResetForm();
    await showSuccessAlert(
      t("password.success.title"),
      t("password.withdrawalSuccess"),
    );
  } catch (err: unknown) {
    await showErrorAlert(
      t("password.error.title"),
      apiMessage(err, "password", "password.error.generic"),
    );
  } finally {
    wdSubmitting.value = false;
  }
});
</script>

<style scoped>
/* Active tab is marked with the theme accent — the same token the inputs use for
   focus — so the panel stays on-theme when the CMS changes the accent. */
.pw-tab {
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
}

.pw-tab.is-active {
  color: var(--tm-accent);
  border-bottom-color: var(--tm-accent);
}
</style>
