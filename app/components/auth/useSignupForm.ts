/**
 * useSignupForm — form state, validation, field bindings, async checks and
 * submit flow for SignupModal.vue.
 *
 * Extracted from the component so the .vue stays a thin presentation layer.
 * Behavior is preserved exactly: vee-validate wiring, currency filtering,
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
 * Static bank list for the signup dropdown. The backend has no `/banks`
 * endpoint (register accepts a free-text `bankName`), so this is a curated
 * list for the KRW deployment. Replace with an API source if one is added.
 */
const STATIC_BANK_NAMES: string[] = [
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "농협은행",
  "기업은행",
  "SC제일은행",
  "카카오뱅크",
  "케이뱅크",
  "토스뱅크",
  "부산은행",
  "대구은행",
  "경남은행",
  "광주은행",
  "새마을금고",
  "우체국",
  "수협은행",
  "산업은행",
];

/** Error shape carried by an ofetch/$fetch error. */
interface FetchErrorLike {
  data?: { message?: string };
  status?: number;
  statusCode?: number;
}

export interface UseSignupFormOptions {
  isOpen: () => boolean;
  onClose: () => void;
}

export function useSignupForm(options: UseSignupFormOptions) {
  const { t, locale } = useI18n();
  const authStore = useAuthStore();
  const currency = useCurrency();
  const api = useApi();

  // Bank names for the signup dropdown. Sourced statically — the backend has
  // no bank-list endpoint and register takes a free-text `bankName`.
  const bankNames = ref<string[]>([...STATIC_BANK_NAMES]);

  // All currencies the codebase knows how to render. The dropdown is
  // filtered to only the deployment currency below — keeping the full
  // list here lets a future multi-currency deployment opt in by removing
  // the filter.
  // Flags render via the inline-SVG <LanguageFlag> component (the same one the
  // header language selector uses), keyed by locale code — no image assets.
  const ALL_CURRENCY_OPTIONS: Array<{
    value: string;
    label: string;
    flagCode: "en" | "id" | "ko" | "th";
  }> = [
    { value: "USD", label: "US Dollar ($)", flagCode: "en" },
    { value: "IDR", label: "Indonesian Rupiah (Rp)", flagCode: "id" },
    { value: "THB", label: "Thai Baht (฿)", flagCode: "th" },
    { value: "KRW", label: "Korean Won (₩)", flagCode: "ko" },
  ];

  // Restrict signup to the deployment currency. The backend can only
  // service the wallets it has banks/limits configured for; allowing a
  // user to register with a different currency would 4xx every deposit.
  const currencyOptions = ALL_CURRENCY_OPTIONS.filter(
    (c) => c.value === currency.code,
  );

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
        email: "",
        mobile: "",
        currency: currency.code,
        bankName: "",
        bankAccountName: "",
        bankAccount: "",
        referral: "",
      },
    });

  const [usernameField] = defineField("username");
  const [passwordField] = defineField("password");
  const [confirmPasswordField] = defineField("confirmPassword");
  const [emailField] = defineField("email");
  const [mobileField] = defineField("mobile");
  const [currencyField] = defineField("currency");
  const [bankNameField] = defineField("bankName");
  const [bankAccountNameField] = defineField("bankAccountName");
  const [bankAccountField] = defineField("bankAccount");
  const [referralField] = defineField("referral");

  const isSubmitting = ref(false);
  const isCheckingUsername = ref(false);
  const isCheckingReferral = ref(false);
  const showPassword = ref(false);
  const showConfirmPassword = ref(false);
  const usernameStatus = ref<"available" | "taken" | null>(null);
  const referralStatus = ref<"valid" | "invalid" | null>(null);

  // Computed — fallback to the (single) deployment-currency option so a
  // THB site shows ฿ and "Thai Baht" instead of the IDR-pinned literals.
  const selectedCurrencyFlag = computed<"en" | "id" | "ko" | "th">(() => {
    const selected = currencyOptions.find(
      (c) => c.value === currencyField.value,
    );
    return selected?.flagCode || currencyOptions[0]?.flagCode || "id";
  });

  const selectedCurrencyLabel = computed(() => {
    const selected = currencyOptions.find(
      (c) => c.value === currencyField.value,
    );
    return (
      selected?.label ||
      currencyOptions[0]?.label ||
      "Indonesian Rupiah (Rp)"
    );
  });

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
      // { username, email?, password, confirmPassword, phone, bankName,
      //   bankAccount, bankAccountName, referral? }. No `currency` field.
      await api("/auth/register", {
        method: "POST",
        body: {
          username: values.username.trim().toLowerCase(),
          password: values.password,
          confirmPassword: values.confirmPassword,
          email: values.email?.trim() || undefined,
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
      const apiMessage = (err as FetchErrorLike)?.data?.message;
      const errorMessage = apiMessage
        ? t(`signup.apiMessages.${apiMessage}`)
        : t("signup.apiMessages.INTERNAL_ERROR");
      await showErrorAlert(t("signup.failed"), errorMessage);
    } finally {
      isSubmitting.value = false;
    }
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && options.isOpen()) {
      options.onClose();
    }
  };

  // Auto-lowercase username, email, and bank account name as the user types
  watch(usernameField, (newVal) => {
    if (typeof newVal === "string" && newVal !== newVal.toLowerCase()) {
      usernameField.value = newVal.toLowerCase();
    }
  });

  watch(emailField, (newVal) => {
    if (typeof newVal === "string" && newVal !== newVal.toLowerCase()) {
      emailField.value = newVal.toLowerCase();
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
    emailField,
    mobileField,
    currencyField,
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
  };
}
