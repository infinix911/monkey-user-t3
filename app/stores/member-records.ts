import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "@/composables/useApi";
import { validateResponse } from "@/lib/validateResponse";
import {
  referralsResponseSchema, mapReferral, loginHistoriesResponseSchema, mapLoginHistory,
  type Referral, type LoginLog,
} from "@/interfaces/auth.interface";
import { logsResponseWireSchema, mapLogsResponse, type ILedgerResponse } from "@/interfaces/ledger";
import {
  walletTransactionsResponseSchema, mapWalletTransaction, activityResponseWireSchema,
  mapActivityResponse, type WalletTransaction, type ActivityResponse,
} from "@/interfaces/transaction.interface";
import {
  betHistoriesResponseWireSchema, mapBetHistoriesResponse, gameLobbiesResponseSchema,
  mapGameLobby, type BetHistoryResponse, type BetHistoryRow, type NormalizedLobby,
} from "@/interfaces/game.interface";

type MemberRecordCacheStatus = "idle" | "loading" | "success" | "error";
export interface CachedEntry<T> {
  data: T | null;
  status: MemberRecordCacheStatus;
  error: string | null;
  fetchedAt: number | null;
}

const entry = <T>(): CachedEntry<T> => ({ data: null, status: "idle", error: null, fetchedAt: null });
const keyOf = (prefix: string, params: Record<string, string | number | undefined>) =>
  `${prefix}:${Object.entries(params).filter(([, value]) => value !== undefined && value !== "").sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`).join("&")}`;

export interface BettingReportQuery {
  startDate: string;
  endDate: string;
  gameType: string;
  provider?: string;
  page: number;
  limit: number;
}

export interface BettingReportData extends BetHistoryResponse {
  loadedGameType: string;
}

/**
 * Member-only history data. Entries are keyed by their complete query and are
 * deliberately memory-only: a logout (or a new browser session) cannot expose
 * a previous member's financial or gameplay records.
 */
export const useMemberRecordsStore = defineStore("member-records", () => {
  const referrals = ref<CachedEntry<Referral[]>>(entry());
  const loginHistories = ref<Record<string, CachedEntry<LoginLog[]>>>({});
  const transactionLogs = ref<Record<string, CachedEntry<ILedgerResponse>>>({});
  const walletTransactions = ref<Record<string, CachedEntry<WalletTransaction[]>>>({});
  const activities = ref<Record<string, CachedEntry<ActivityResponse>>>({});
  const bettingReports = ref<Record<string, CachedEntry<BettingReportData>>>({});
  const providerLobbies = ref<Record<string, CachedEntry<NormalizedLobby[]>>>({});
  const inFlight = new Map<string, Promise<unknown>>();

  async function load<T>(
    key: string,
    collection: Record<string, CachedEntry<T>> | { value: CachedEntry<T> },
    fetcher: () => Promise<T>,
    force = false,
  ): Promise<CachedEntry<T>> {
    const isSingle = "value" in collection;
    const current = isSingle ? collection.value : (collection[key] ??= entry<T>());
    if (!force && current.status === "success") return current;
    const pending = inFlight.get(key) as Promise<CachedEntry<T>> | undefined;
    if (pending) return pending;
    current.status = "loading";
    current.error = null;
    const request = fetcher().then((data) => {
      current.data = data;
      current.status = "success";
      current.fetchedAt = Date.now();
      return current;
    }).catch((error: unknown) => {
      current.status = "error";
      current.error = error instanceof Error ? error.message : "Failed to load records";
      return current;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  }

  const loadReferrals = (force = false) => load("referrals", referrals, async () => {
    const raw = await useApi()("/auth/referrals");
    return validateResponse(referralsResponseSchema, raw, "/auth/referrals").map(mapReferral);
  }, force);

  const loadLoginHistories = (params: { startDate: string; endDate: string }, force = false) => {
    const key = keyOf("login", params);
    return load(key, loginHistories.value, async () => {
      const raw = await useApi()("/auth/login-histories", { query: params });
      return validateResponse(loginHistoriesResponseSchema, raw, "/auth/login-histories").map(mapLoginHistory);
    }, force);
  };

  const loadTransactionLogs = (params: { page: number; limit: number }, force = false) => {
    const key = keyOf("logs", params);
    return load(key, transactionLogs.value, async () => mapLogsResponse(validateResponse(
      logsResponseWireSchema, await useApi()("/transactions/logs", { query: params }), "/transactions/logs")), force);
  };

  const loadWalletTransactions = (params: { type: "deposit" | "withdrawal"; startDate: string; endDate: string; method?: string }, force = false) => {
    const key = keyOf("wallet", params);
    return load(key, walletTransactions.value, async () => {
      const { type, ...query } = params;
      const raw = await useApi()(`/transactions/wallet/${type}`, { query });
      return validateResponse(walletTransactionsResponseSchema, raw, "/transactions/wallet").map(mapWalletTransaction);
    }, force);
  };

  const loadActivity = (params: { category: string; page: number; limit: number }, force = false) => {
    const key = keyOf("activity", params);
    return load(key, activities.value, async () => {
      const { category, ...query } = params;
      return mapActivityResponse(validateResponse(activityResponseWireSchema,
        await useApi()(`/transactions/activity/${category}`, { query }), "/transactions/activity"));
    }, force);
  };

  const loadProviderLobbies = (gameType: string, force = false) => {
    const key = keyOf("providers", { gameType });
    return load(key, providerLobbies.value, async () => validateResponse(gameLobbiesResponseSchema,
      await useApi()("/games/lobbies", { query: { gameType } }), "/games/lobbies").map(mapGameLobby), force);
  };

  const loadBettingReport = (params: BettingReportQuery, force = false) => {
    const key = keyOf("betting", { ...params });
    return load(key, bettingReports.value, async () => {
      const { gameType, provider, page, limit, startDate, endDate } = params;
      const types = gameType === "all" ? ["casino", "slot", "sport", "mini"] : [gameType];
      const responses = await Promise.all(types.map(async (type) => {
        const query = new URLSearchParams({ startDate, endDate, page: String(page), limit: String(limit) });
        if (provider) query.set("gameName", provider);
        const raw = await useApi()(`/games/bet-histories/${type}?${query}`);
        const data = mapBetHistoriesResponse(validateResponse(betHistoriesResponseWireSchema, raw, "/games/bet-histories"));
        return { ...data, data: data.data.map((row) => ({ ...row, game_type: type })) };
      }));
      const sum = (field: keyof NonNullable<BetHistoryResponse["summary"]>) => String(responses.reduce((total, response) => total + Number(response.summary?.[field] ?? "0"), 0));
      return {
        data: responses.flatMap((response) => response.data).sort((a: BetHistoryRow, b: BetHistoryRow) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()),
        pages: Math.max(0, ...responses.map((response) => response.pages)),
        rows: responses.reduce((total, response) => total + response.rows, 0),
        summary: { bet_amount: sum("bet_amount"), win_amount: sum("win_amount"), roll_amount: sum("roll_amount"), net_amount: sum("net_amount") },
        loadedGameType: gameType,
      };
    }, force);
  };

  const clear = () => {
    referrals.value = entry(); loginHistories.value = {}; transactionLogs.value = {};
    walletTransactions.value = {}; activities.value = {}; bettingReports.value = {}; providerLobbies.value = {};
    inFlight.clear();
  };

  return { referrals, loginHistories, transactionLogs, walletTransactions, activities, bettingReports, providerLobbies,
    loadReferrals, loadLoginHistories, loadTransactionLogs, loadWalletTransactions, loadActivity, loadProviderLobbies, loadBettingReport, clear };
});
