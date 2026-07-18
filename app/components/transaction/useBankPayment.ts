/**
 * useBankPayment — state, computed summary, validation wiring and submit
 * flow for BankPaymentContent.vue.
 *
 * Extracted verbatim from the component to keep the .vue a thin presentation
 * layer. All behavior — vee-validate wiring, currency math, voucher/bonus
 * computation, receipt upload, deposit submit and voucher fetch — is preserved
 * exactly, including the original axios error-message extraction.
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

export interface IVoucherIssue {
  issue_id: string;
  voucher_id: string;
  voucher: string;
  description: string;
  valid_to: string;
  enable_popup: boolean;
  popup_text: string | null;
  tiers: {
    min_value: number;
    reward_type: string;
    reward_value: number;
    cap: number;
  }[];
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

  const vouchers = ref<IVoucherIssue[]>([]);
  const loadingVouchers = ref(false);
  const selectedPayment = ref<PaymentMethod | null>(null);
  const depositAmount = ref("0");
  const selectedVoucher = ref<IVoucherIssue | null>(null);

  // Popup state — shown when a selected voucher has enable_popup:true
  const pendingVoucher = ref<IVoucherIssue | null>(null);
  const showVoucherPopup = ref(false);

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

  // PULSA deposits don't support vouchers — clear any prior selection so a
  // voucher chosen under BANK/E-MONEY isn't submitted after switching to PULSA.
  watch(
    () => options.paymentType?.(),
    (type) => {
      if (type === "PULSA") selectedVoucher.value = null;
    },
    { immediate: true },
  );

  const bonus = computed(() => {
    if (!selectedVoucher.value) return 0;

    const sortedTiers = [...selectedVoucher.value.tiers].sort(
      (a, b) => Number(b.min_value) - Number(a.min_value),
    );
    const applicableTier = sortedTiers.find(
      (tier) => depositAmountNum.value >= Number(tier.min_value),
    );

    if (!applicableTier) return 0;

    const rewardValue = Number(applicableTier.reward_value);
    let rewardAmount =
      applicableTier.reward_type === "percentage"
        ? depositAmountNum.value * (rewardValue / 100)
        : rewardValue;

    const cap = Number(applicableTier.cap);
    if (cap > 0 && rewardAmount > cap) {
      rewardAmount = cap;
    }

    return Number(rewardAmount.toFixed(2));
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
  const totalNetAmount = computed(() => netAmount.value + bonus.value);

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

  function handleVoucherChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    const selected = vouchers.value.find((v) => v.issue_id === value);
    if (!selected) {
      selectedVoucher.value = null;
      return;
    }
    if (selected.enable_popup) {
      pendingVoucher.value = selected;
      showVoucherPopup.value = true;
    } else {
      selectedVoucher.value = selected;
    }
  }

  function handlePopupAgree() {
    selectedVoucher.value = pendingVoucher.value;
    pendingVoucher.value = null;
    showVoucherPopup.value = false;
  }

  function handlePopupDisagree() {
    pendingVoucher.value = null;
    showVoucherPopup.value = false;
    selectedVoucher.value = null;
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
    selectedVoucher.value = null;
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

  // Vouchers are not fetched: the backend has no /promotions endpoint and
  // deposit carries no voucher field. The voucher UI is hidden in
  // BankPaymentContent. (State kept so the surface can be re-enabled if a
  // promotions API is added.)

  return {
    siteConfig,
    currency,
    errors,
    vouchers,
    loadingVouchers,
    selectedPayment,
    depositAmount,
    selectedVoucher,
    showVoucherPopup,
    pendingVoucher,
    fileName,
    isBankModalOpen,
    selectedBankAccount,
    depositAmountNum,
    bonus,
    serviceFee,
    netAmount,
    totalNetAmount,
    quickAmounts: QUICK_AMOUNTS,
    getTranslatedAmount,
    formatCurrency,
    formatCurrencyInput,
    handleAmountInput,
    handleAmountClick,
    handleMax,
    handleReset,
    handleVoucherChange,
    handlePopupAgree,
    handlePopupDisagree,
    handleFileChange,
    handleCopy,
    handleBankSelect,
    onSubmit,
  };
}
