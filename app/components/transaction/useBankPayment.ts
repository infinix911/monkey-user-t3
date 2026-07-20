/**
 * useBankPayment — state, computed summary, validation wiring and submit
 * flow for BankPaymentContent.vue.
 *
 * Extracted verbatim from the component to keep the .vue a thin presentation
 * layer. All behavior — vee-validate wiring, currency math, receipt upload and
 * deposit submit — is preserved exactly, including the original axios
 * error-message extraction.
 */

import { useForm } from "vee-validate";
import { useApi } from "@/composables/useApi";
import {
  showSuccessAlert,
  showErrorAlert,
  showAutoAlert,
} from "~~/utils/swal-alert";
import { depositSchema } from "@/schemas";

/** Error body shape carried by an ofetch/$fetch error. */
interface FetchErrorLike {
  data?: { message?: string };
  message?: string;
}

/** Read the API `message` from a $fetch error body, if present. */
function fetchErrorMessage(error: unknown): string | undefined {
  return (error as FetchErrorLike)?.data?.message;
}

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

const MAX_DEPOSIT_AMOUNT = 100000000;

export const QUICK_AMOUNTS = ["5K", "50K", "100K", "250K", "500K", "1JT"];

export interface UseBankPaymentOptions {
  bankAccounts: () => IBankAccount[] | undefined;
  paymentType?: () => string | undefined;
}

export function useBankPayment(options: UseBankPaymentOptions) {
  const siteConfig = useSiteConfig();
  const currency = useCurrency();
  const { t, locale } = useI18n();
  const api = useApi();

  // VeeValidate form — reactive schema so the (baked) validation messages
  // follow the active locale instead of freezing to the first language.
  const {
    handleSubmit: veeHandleSubmit,
    errors: rawErrors,
    setFieldValue,
    resetForm: veeResetForm,
  } = useForm({
    validationSchema: computed(() => {
      void locale.value;
      return depositSchema(t);
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

  const selectedFile = ref<File | null>(null);
  const fileName = ref(t("deposit.noFilesSelected"));
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

  const serviceFee = computed(() => {
    if (!selectedBankAccount.value) return 0;
    const fee =
      selectedBankAccount.value.credit_fee_type === "percentage"
        ? (depositAmountNum.value *
            Number(selectedBankAccount.value.credit_fee)) /
          100
        : Number(selectedBankAccount.value.credit_fee);
    return Number(fee.toFixed(2));
  });

  const netAmount = computed(() => depositAmountNum.value - serviceFee.value);

  function getTranslatedAmount(amount: string): string {
    return t(`common.quickAmounts.${amount}`) || amount;
  }

  function formatCurrency(amount: string | number): string {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${currency.symbol} ${num.toLocaleString(currency.locale)}`;
  }

  function formatCurrencyInput(value: string): string {
    const num = parseFloat(value || "0");
    return num.toLocaleString(currency.locale);
  }

  function handleAmountInput(event: Event) {
    const value = (event.target as HTMLInputElement).value.replace(
      /[^0-9]/g,
      "",
    );
    const numValue = parseFloat(value);

    if (isNaN(numValue) || numValue <= MAX_DEPOSIT_AMOUNT) {
      depositAmount.value = value;
    }
  }

  function handleAmountClick(amount: string) {
    const clickedValue = amount.replace("K", "000").replace("JT", "000000");
    const currentAmount = parseFloat(depositAmount.value || "0");
    const newAmount = currentAmount + parseFloat(clickedValue);
    const finalAmount = Math.min(newAmount, MAX_DEPOSIT_AMOUNT);
    depositAmount.value = String(finalAmount);
  }

  function handleMax() {
    depositAmount.value = String(MAX_DEPOSIT_AMOUNT);
  }

  function handleReset() {
    depositAmount.value = "0";
  }

  function handleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      selectedFile.value = file;
      fileName.value = file.name;
    }
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
    selectedFile.value = null;
    fileName.value = t("deposit.noFilesSelected");
    selectedPayment.value = null;
    submitted.value = false;
    veeResetForm();
    autoSelectBank(); // keep the fixed bank shown after a successful deposit
  }

  const onSubmit = async () => {
    submitted.value = true;
    await veeSubmit();
  };

  const veeSubmit = veeHandleSubmit(async (values) => {
    let receiptURL: string | null = null;

    if (selectedFile.value) {
      const formData = new FormData();
      formData.append("file", selectedFile.value);

      try {
        const data = await api<{ message: string; url: string }>(
          "/transactions/deposit/upload-receipt",
          { method: "POST", body: formData },
        );
        receiptURL = data.url ?? null;

        if (!receiptURL) {
          throw new Error("No URL returned from upload");
        }
      } catch (error: unknown) {
        const uploadErr = error as FetchErrorLike;
        const errorMessage =
          uploadErr?.data?.message ||
          uploadErr?.message ||
          "File upload failed";
        await showErrorAlert(
          t("deposit.title"),
          `${t("deposit.errors.fileUploadFailed")}: ${errorMessage}`,
        );
        return;
      }
    }

    // Backend contract (camelCase, see createDepositSchema in monkey-user-api):
    // { amount: number, receiptImage?: string | null }. The backend derives the
    // deposit account itself (no accountId) and has no voucher support.
    const depositData = {
      amount: depositAmountNum.value,
      receiptImage: receiptURL,
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
      const depositMessage = fetchErrorMessage(error);
      if (depositMessage) {
        await showErrorAlert(
          t("deposit.title"),
          t(`deposit.apiMessages.${depositMessage}`),
        );
      } else {
        await showErrorAlert(
          t("deposit.title"),
          t("deposit.apiMessages.INTERNAL_ERROR"),
        );
      }
    }
  });

  return {
    siteConfig,
    currency,
    errors,
    selectedPayment,
    depositAmount,
    fileName,
    isBankModalOpen,
    selectedBankAccount,
    depositAmountNum,
    serviceFee,
    netAmount,
    quickAmounts: QUICK_AMOUNTS,
    getTranslatedAmount,
    formatCurrency,
    formatCurrencyInput,
    handleAmountInput,
    handleAmountClick,
    handleMax,
    handleReset,
    handleFileChange,
    handleCopy,
    handleBankSelect,
    onSubmit,
  };
}
