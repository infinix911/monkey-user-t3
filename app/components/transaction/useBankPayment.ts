/**
 * useBankPayment — state, computed summary, validation wiring and submit
 * flow for BankPaymentContent.vue.
 *
 * Extracted verbatim from the component to keep the .vue a thin presentation
 * layer. Covers vee-validate wiring, currency math and deposit submit. The
 * receipt upload and the transaction-summary math were removed with the
 * proof-of-transfer and summary UI.
 */

import { useForm } from "vee-validate";
import { useApi } from "@/composables/useApi";
import {
  showSuccessAlert,
  showErrorAlert,
  showAutoAlert,
} from "~~/utils/swal-alert";
import { depositSchema } from "@/schemas";

export interface IBankAccount {
  id: string;
  account_name: string;
  bank: string;
  code: string;
  account_number: string;
  credit_fee_type: string;
  credit_fee: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  label: string;
  logo: string;
  bankData?: IBankAccount;
}

/**
 * Ceiling used only when the CMS has no `deposits:maximum`. The configured
 * value wins — see `maxAmount` below.
 */
const MAX_DEPOSIT_AMOUNT = 100000000;

export const QUICK_AMOUNTS = ["5K", "50K", "100K", "250K", "500K", "1JT"];

export interface UseBankPaymentOptions {
  bankAccounts: () => IBankAccount[] | undefined;
}

export function useBankPayment(options: UseBankPaymentOptions) {
  const siteConfig = useSiteConfig();
  const currency = useCurrency();
  const { t, locale } = useI18n();
  const apiMessage = useApiMessage();
  const api = useApi();

  // Min/max/divisible come from the CMS (`deposits:*` in /site/settings).
  const limits = useTransactionLimits("deposits");

  // VeeValidate form — reactive schema so the (baked) validation messages
  // follow the active locale instead of freezing to the first language, and so
  // the amount rules pick up the CMS limits once settings land.
  const {
    handleSubmit: veeHandleSubmit,
    errors: rawErrors,
    setFieldValue,
    resetForm: veeResetForm,
  } = useForm({
    validationSchema: computed(() => {
      void locale.value;
      return depositSchema(t, limits.value);
    }),
    initialValues: {
      depositAmount: "0",
      bankAccountId: "",
    },
  });

  // Only show errors after first submit attempt
  const submitted = ref(false);
  const errors = computed(() => (submitted.value ? rawErrors.value : {}));

  const selectedPayment = ref<PaymentMethod | null>(null);
  const depositAmount = ref("0");

  const isBankModalOpen = ref(false);

  const bankAccountsList = computed(() => options.bankAccounts() || []);

  const selectedBankAccount = computed<IBankAccount | undefined>(() => {
    if (selectedPayment.value?.bankData) return selectedPayment.value.bankData;
    return bankAccountsList.value.find(
      (acc) => acc.id === selectedPayment.value?.id,
    );
  });

  const depositAmountNum = computed(() =>
    parseFloat(depositAmount.value || "0"),
  );

  // Sync local state to vee-validate fields (no eager validation — errors show on submit only)
  watch(depositAmount, (newVal) => {
    setFieldValue("depositAmount", newVal, false);
  });

  watch(selectedPayment, (newVal) => {
    setFieldValue("bankAccountId", newVal?.id || "", false);
  });

  // serviceFee / netAmount lived only in the transaction-summary card, which was
  // removed along with the proof-of-transfer upload. The fee was always 0 in
  // practice (the fixed deposit account carries credit_fee "0"), and the backend
  // computes the credited amount itself.

  function getTranslatedAmount(amount: string): string {
    return t(`common.quickAmounts.${amount}`) || amount;
  }

  function formatCurrencyInput(value: string): string {
    const num = parseFloat(value || "0");
    return num.toLocaleString(currency.locale);
  }

  /** CMS `deposits:maximum`, falling back to the bundled ceiling. */
  const maxAmount = computed(() =>
    Number.isFinite(limits.value.maximum)
      ? limits.value.maximum
      : MAX_DEPOSIT_AMOUNT,
  );

  function handleAmountInput(event: Event) {
    const value = (event.target as HTMLInputElement).value.replace(
      /[^0-9]/g,
      "",
    );
    const numValue = parseFloat(value);

    if (isNaN(numValue) || numValue <= maxAmount.value) {
      depositAmount.value = value;
    }
  }

  function handleAmountClick(amount: string) {
    const clickedValue = amount.replace("K", "000").replace("JT", "000000");
    const currentAmount = parseFloat(depositAmount.value || "0");
    const newAmount = currentAmount + parseFloat(clickedValue);
    const finalAmount = Math.min(newAmount, maxAmount.value);
    depositAmount.value = String(finalAmount);
  }

  function handleMax() {
    depositAmount.value = String(maxAmount.value);
  }

  function handleReset() {
    depositAmount.value = "0";
  }

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      const labelText =
        label === "accountName"
          ? t("deposit.copy.accountName")
          : t("deposit.copy.accountNumber");
      showAutoAlert(`${labelText} ${t("deposit.copy.success")}`);
    } catch (error) {
      console.error("Copy failed:", error);
      showAutoAlert("Failed to copy", "error");
    }
  }

  function handleBankSelect(bankAccount: IBankAccount) {
    selectedPayment.value = {
      id: bankAccount.id,
      name: bankAccount.account_name,
      label: bankAccount.bank.substring(0, 10),
      logo: `${siteConfig.assets.transaction.bankBasePath}/${bankAccount.bank}.png`,
      bankData: bankAccount,
    };
  }

  // The bank is no longer user-selectable — the deposit account is fixed by the
  // API. Auto-select the first account so the info card + submission stay wired.
  function autoSelectBank() {
    const list = bankAccountsList.value;
    if (list.length > 0 && list[0]) handleBankSelect(list[0]);
  }
  watch(
    bankAccountsList,
    () => {
      if (!selectedPayment.value) autoSelectBank();
    },
    { immediate: true },
  );

  function resetForm() {
    depositAmount.value = "0";
    selectedPayment.value = null;
    submitted.value = false;
    veeResetForm();
    autoSelectBank(); // keep the fixed bank shown after a successful deposit
  }

  const onSubmit = async () => {
    submitted.value = true;
    await veeSubmit();
  };

  const veeSubmit = veeHandleSubmit(async () => {
    // Backend contract (camelCase, see createDepositSchema in monkey-user-api):
    // { amount: number, receiptImage?: string | null }. The backend derives the
    // deposit account itself (no accountId) and has no voucher support.
    // `receiptImage` is now always null — the proof-of-transfer upload was
    // removed from the modal, so nothing calls /deposit/upload-receipt.
    const depositData = {
      amount: depositAmountNum.value,
      receiptImage: null,
    };

    try {
      await api("/transactions/deposit", {
        method: "POST",
        body: depositData,
      });
      await showSuccessAlert(
        t("deposit.success.title"),
        t("deposit.success.text"),
      );
      resetForm();
    } catch (error: unknown) {
      await showErrorAlert(t("deposit.title"), apiMessage(error, "deposit"));
    }
  });

  return {
    siteConfig,
    currency,
    errors,
    selectedPayment,
    depositAmount,
    isBankModalOpen,
    selectedBankAccount,
    depositAmountNum,
    quickAmounts: QUICK_AMOUNTS,
    getTranslatedAmount,
    formatCurrencyInput,
    handleAmountInput,
    handleAmountClick,
    handleMax,
    handleReset,
    handleCopy,
    handleBankSelect,
    onSubmit,
  };
}
