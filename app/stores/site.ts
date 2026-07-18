import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Site-data store — bank accounts, site settings and pool status fetched from
 * the backend. Split out of the former monolithic `app` store. Cleared on
 * logout via [[useAuthStore]].
 */

export interface BankAccount {
  id: string;
  account_name: string;
  bank: string;
  code?: string;
  account_number: string;
  credit_fee_type?: string;
  credit_fee?: string;
}

export interface SiteSettingItem {
  key: string;
  value: string;
}

export interface SiteSettings {
  [key: string]: string;
}

export interface PoolStatus {
  id: string;
  pool: string;
  pool_type: string;
  current_period: number;
  is_active: boolean;
  last_result: number;
  bet_close_time: number;
}

export const useSiteStore = defineStore("site", () => {
  const bankAccounts = ref<BankAccount[]>([]);
  const siteSettings = ref<SiteSettings | null>(null);
  const poolData = ref<PoolStatus[]>([]);

  const setBankAccounts = (accounts: BankAccount[]) => {
    bankAccounts.value = accounts;
  };

  const setSiteSettings = (settings: SiteSettings | null) => {
    siteSettings.value = settings;
  };

  const setPoolData = (data: PoolStatus[]) => {
    poolData.value = data;
  };

  /** Reset all site data — called from useAuthStore.logout(). */
  const clear = () => {
    bankAccounts.value = [];
    siteSettings.value = null;
  };

  return {
    bankAccounts,
    siteSettings,
    poolData,
    setBankAccounts,
    setSiteSettings,
    setPoolData,
    clear,
  };
});
