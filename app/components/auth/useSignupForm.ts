/**
 * useSignupForm — form state, validation, field bindings, async checks and
 * submit flow for SignupModal.vue.
 *
 * Extracted from the component so the .vue stays a thin presentation layer.
 * Behavior is preserved exactly: vee-validate wiring,
 * username/referral availability checks, debounced referral auto-check,
 * auto-lowercasing watches, registration submit and the open/close DOM
 * lifecycle (keydown + body scroll lock + stored-referral hydration).
 */

import { useForm } from "vee-validate";
import { useApi } from "@/composables/useApi";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";
import { signupSchema } from "@/schemas";
import { toTitleCase } from "@/lib/formatter";

/**
 * Offline fallback bank list for the signup dropdown. The primary source is
 * the DB via `GET /site/banks` (active + registerable); this curated KRW list
 * is only used if that public read fails, so the form never renders an empty
 * dropdown.
 */
const STATIC_BANK_NAMES: string[] = [
  "KB국민은행",
  "신한은행",
  "우리은행",
  "KEB하나은행",
  "카카오뱅크",
  "카카오증권",
  "KDB산업은행",
  "IBK기업은행",
  "NH농협은행",
  "수협은행",
  "대구은행",
  "BNK부산은행",
  "BNK경남은행",
  "광주은행",
  "전북은행",
  "제주은행",
  "농·축협",
  "농협",
  "축협",
  "새마을금고",
  "우체국",
  "신용협동조합",
  "산림조합",
  "HSBC은행",
  "한국씨티은행",
  "한국스탠다드차타드은행",
  "미래애셋",
  "SC제일은행",
  "케이뱅크",
];

export interface UseSignupFormOptions {
  isOpen: () => boolean;
  onClose: () => void;
}

export function useSignupForm(options: UseSignupFormOptions) {
  const { t, locale } = useI18n();
  const apiMessage = useApiMessage();
  const authStore = useAuthStore();
  const api = useApi();

  // Bank names for the signup dropdown. Loaded from the DB (active +
  // registerable) via GET /site/banks; the static list seeds the ref and is the
  // fallback if that public read fails, so the pre-auth form is never empty.
  const bankNames = ref<string[]>([...STATIC_BANK_NAMES]);
  let banksLoaded = false;

  /** Populate the bank dropdown from the DB, keeping the static fallback on failure. */
  async function loadBanks(): Promise<void> {
    if (banksLoaded) return;
    try {
      const rows = await api<{ id: string; name: string }[]>("/site/banks");
      if (Array.isArray(rows) && rows.length) {
        bankNames.value = rows.map((b) => b.name);
        banksLoaded = true;
      }
    } catch {
      // Network/API failure — keep the static fallback list.
    }
  }

  // VeeValidate form
  const { handleSubmit, errors, defineField, resetForm, setFieldValue } =
    useForm({
      // Reactive schema: rebuild the (message-baked) zod schema whenever the
      // locale changes so validation errors follow the active language instead
      // of being frozen to whatever locale was active at first setup.
      validationSchema: computed(() => {
        void locale.value;
        return signupSchema(t);
      }),
      initialValues: {
        username: "",
        password: "",
        confirmPassword: "",
        withdrawalPassword: "",
        mobile: "",
        bankName: "",
        bankAccountName: "",
        bankAccount: "",
        referral: "",
      },
    });

  const [usernameField] = defineField("username");
  const [passwordField] = defineField("password");
  const [confirmPasswordField] = defineField("confirmPassword");
  const [withdrawalPasswordField] = defineField("withdrawalPassword");
  const [mobileField] = defineField("mobile");
  const [bankNameField] = defineField("bankName");
  const [bankAccountNameField] = defineField("bankAccountName");
  const [bankAccountField] = defineField("bankAccount");
  const [referralField] = defineField("referral");

  const isSubmitting = ref(false);
  const isCheckingUsername = ref(false);
  const isCheckingReferral = ref(false);
  const showPassword = ref(false);
  const showConfirmPassword = ref(false);
  const showWithdrawalPassword = ref(false);
  const usernameStatus = ref<"available" | "taken" | null>(null);
  const referralStatus = ref<"valid" | "invalid" | null>(null);

  // Methods
  const checkUsername = async () => {
    if (!(usernameField.value ?? "").trim()) return;

    isCheckingUsername.value = true;
    usernameStatus.value = null;

    try {
      await api("/auth/check/username", {
        method: "POST",
        body: {
          username: (usernameField.value ?? "").trim().toLowerCase(),
        },
      });
      usernameStatus.value = "available";
    } catch {
      usernameStatus.value = "taken";
    } finally {
      isCheckingUsername.value = false;
    }
  };

  const checkReferral = async () => {
    if (!(referralField.value ?? "").trim()) return;

    isCheckingReferral.value = true;
    referralStatus.value = null;

    try {
      await api("/auth/check/referral", {
        method: "POST",
        body: {
          referral: (referralField.value ?? "").trim(),
        },
      });
      referralStatus.value = "valid";
    } catch {
      referralStatus.value = "invalid";
    } finally {
      isCheckingReferral.value = false;
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    isSubmitting.value = true;

    try {
      // Backend contract (camelCase, see registerSchema in monkey-user-api):
      // { username, password, confirmPassword, withdrawalPassword?, phone,
      //   bankName, bankAccount, bankAccountName, referral? }. Neither email
      // nor currency is sent: email is optional server-side and the form no
      // longer collects it, and registerSchema has no currency field at all.
      // `withdrawalPassword` is optional server-side (older
      // clients omit it) but the form requires it, so it is always sent here.
      await api("/auth/register", {
        method: "POST",
        body: {
          username: values.username.trim().toLowerCase(),
          password: values.password,
          confirmPassword: values.confirmPassword,
          withdrawalPassword: values.withdrawalPassword,
          phone: values.mobile.trim(),
          bankName: values.bankName,
          bankAccountName: toTitleCase(values.bankAccountName.trim()),
          bankAccount: values.bankAccount.trim(),
          referral: values.referral?.trim() || null,
        },
      });

      resetForm();
      usernameStatus.value = null;
      referralStatus.value = null;
      options.onClose();
      await showSuccessAlert(t("signup.successTitle"), t("signup.success"));
    } catch (err: unknown) {
      await showErrorAlert(t("signup.failed"), apiMessage(err, "signup"));
    } finally {
      isSubmitting.value = false;
    }
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && options.isOpen()) {
      options.onClose();
    }
  };

  // Auto-lowercase username and title-case bank account name as the user types
  watch(usernameField, (newVal) => {
    if (typeof newVal === "string" && newVal !== newVal.toLowerCase()) {
      usernameField.value = newVal.toLowerCase();
    }
  });

  watch(bankAccountNameField, (newVal) => {
    if (typeof newVal !== "string") return;
    const formatted = toTitleCase(newVal);
    if (formatted !== newVal) {
      bankAccountNameField.value = formatted;
    }
  });

  // Debounced referral auto-check
  let referralDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    () => referralField.value,
    (newVal) => {
      referralStatus.value = null;
      if (referralDebounceTimer) clearTimeout(referralDebounceTimer);
      if (newVal && newVal.trim() !== "") {
        referralDebounceTimer = setTimeout(() => {
          checkReferral();
        }, 300);
      }
    },
  );

  // Watch for modal open/close.
  // `immediate: true` is required: the parent (AppHeader.vue) gates this modal
  // with `v-if="authStore.showSignupModal"`, so the component mounts fresh with
  // `isOpen` already `true`. Without `immediate`, the watcher would never fire
  // for that initial state — the referral code (set by useReferralHandler when
  // the page is opened with `?referral=`) would never reach the form field.
  watch(
    options.isOpen,
    (newVal) => {
      if (newVal) {
        document.addEventListener("keydown", handleKeydown);
        document.body.style.overflow = "hidden";
        void loadBanks();

        // Load referral code from authStore or localStorage
        const storedReferral =
          authStore.referralCode ||
          (typeof window !== "undefined"
            ? localStorage.getItem("referralCode")
            : null);
        if (storedReferral) {
          setFieldValue("referral", storedReferral);
          authStore.setReferralCode(null);
        }
      } else {
        document.removeEventListener("keydown", handleKeydown);
        document.body.style.overflow = "";
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
    document.body.style.overflow = "";
    if (referralDebounceTimer) clearTimeout(referralDebounceTimer);
  });

  return {
    bankNames,
    errors,
    usernameField,
    passwordField,
    confirmPasswordField,
    withdrawalPasswordField,
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
    showWithdrawalPassword,
    usernameStatus,
    referralStatus,
    checkUsername,
    checkReferral,
    onSubmit,
  };
}
