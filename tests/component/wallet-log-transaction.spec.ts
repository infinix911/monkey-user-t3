/**
 * Wallet-log `transaction` labels (utils/walletLogTransaction.ts).
 *
 * Shown in the account Transaction Logs and the Activity tabs. Fixed ledger
 * values map to `walletLogs.transactionTypes.*` (same keys and wording as
 * monkey-admin); game lobby names resolve through `game.providers`, so under
 * Korean no current lobby name may render in English.
 *
 * Runs against the real locale files read from disk (plain JSON).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { walletLogTransactionLabel } from "@/utils/walletLogTransaction";

type Messages = Record<string, unknown>;
const load = (name: string): Messages =>
  JSON.parse(readFileSync(resolve(__dirname, `../../i18n/locales/${name}.json`), "utf8")) as Messages;

/** Minimal vue-i18n `t` / `te` over a locale object, with `{param}` interpolation. */
function i18n(messages: Messages) {
  const get = (key: string): unknown =>
    key.split(".").reduce<unknown>((node, part) => (node as Messages | undefined)?.[part], messages);
  const te = (key: string): boolean => typeof get(key) === "string";
  const t = (key: string, params: Record<string, unknown> = {}): string =>
    String(get(key)).replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
  return { t, te };
}

const en = load("en");
const ko = load("ko");
const KO = i18n(ko);
const label = (value: unknown, { t, te } = KO) => walletLogTransactionLabel(t, te, value);

describe("walletLogTransactionLabel — fixed values", () => {
  it("translates every value the APIs write today", () => {
    expect(label("DEPOSIT_APPROVED")).toBe("입금 승인");
    expect(label("WITHDRAWAL_REJECTED")).toBe("출금 거절 (환불)");
    expect(label("User Withdrawal")).toBe("출금 신청");
    expect(label("WALLET_TRANSFER_SEND")).toBe("지갑 이체 (보냄)");
    expect(label("Agent Wallet Transfer (ADD)")).toBe("에이전트 지갑 이체 (지급)");
    expect(label("Agent Wallet Transfer (DEDUCT)")).toBe("에이전트 지갑 이체 (차감)");
  });

  it("translates historical values and the provider pattern", () => {
    expect(label("WITHDRAWAL_CANCEL")).toBe("출금 취소");
    expect(label("ADMIN_DEDUCT")).toBe("관리자 차감");
    expect(label("KH_WITHDRAWAL")).toBe("게임 지갑 회수 (KH)");
  });

  it("has the same transaction-type keys in en and ko", () => {
    const keys = (m: Messages) => Object.keys((m.walletLogs as { transactionTypes: object }).transactionTypes).sort();
    expect(keys(en)).toEqual(keys(ko));
  });

  it("uses English labels under en", () => {
    expect(label("Agent Wallet Transfer (DEDUCT)", i18n(en))).toBe("Agent Wallet Transfer (Deduct)");
  });
});

describe("walletLogTransactionLabel — game lobby names", () => {
  it("translates names as written, brand alone for shared names", () => {
    expect(label("Pragmatic")).toBe("프라그마틱");
    expect(label("Pragmatic Slots")).toBe("프라그마틱 슬롯");
    expect(label("Oriental Gaming")).toBe("오리엔탈게임");
    expect(label("Evolution 1:1")).toBe("에볼루션 1:1");
  });

  it("never renders a current lobby name in English under ko", () => {
    // gameName of every current lobby (GET /games/lobbies, 2026-10-01).
    const names = [
      "Evolution", "Pragmatic", "Dream Gaming", "Asia Gaming", "Big Gaming", "Microgaming", "Oriental Gaming",
      "Playtech", "Bota", "Sexy Gaming", "AllBet", "Skywind", "Motivation", "SA Gaming", "Pretty Gaming",
      "Dowinn", "Cyberbetx", "BNG", "CQ9", "Habanero", "PG Soft", "Blueprint", "Nolimit City", "Relax",
      "YGGDrasil", "Gameart", "Play N Go", "Playstar", "Hacksaw", "Evoplay", "Booming", "Expanse", "Octoplay",
      "Avatar UX", "Slotmill", "Peter & Sons", "Reelplay", "Fantasma", "4 The Player", "Thunderkick",
      "Wazdan", "Slot Matrix", "Funky Games", "OneTouch", "Revolver", "Rubyplay", "1x2 Gaming", "Kalamba",
      "Smartsoft", "Dragoonsoft", "Endorphina", "Aspect", "Naga", "Advantplay", "Simpleplay", "FC",
      "Reevo", "Yellowbat", "Croco", "Belatra", "BT1 Sports",
      "GMW", "WM", "GPI", "IDG", "9G", "JDB", "Ftg",
    ];
    // Names the approved Korean list itself writes in Latin letters.
    const latin = new Set(["GMW", "WM", "IDG", "9G", "FTG", "GPI", "JDB"]);
    const english = names.filter((n) => !/[가-힣]/.test(label(n)) && !latin.has(label(n)));
    expect(english).toEqual([]);
  });
});

describe("walletLogTransactionLabel — game name + note suffix", () => {
  it("translates both the lobby name and a known note", () => {
    expect(label("Pragmatic Slots - 최대 당첨금 초과 차감")).toBe("프라그마틱 슬롯 - 최대 당첨금 초과 차감");
    expect(label("Pragmatic Slots - 최대 당첨금 초과 차감", i18n(en))).toBe("Pragmatic Slots - Max Win Exceeded (Deduction)");
  });

  it("passes an unknown note through while still translating the lobby name", () => {
    expect(label("Evolution - 기타")).toBe("에볼루션 - 기타");
  });
});

describe("walletLogTransactionLabel — every value seen in member_wallet_logs", () => {
  // Distinct `transaction` values in demomonkey on 2026-10-01 (the Activity
  // modal's Service / Provider columns). Under ko none may stay in English.
  const SEEN: Record<string, string> = {
    "Agent Wallet Transfer (ADD)": "에이전트 지갑 이체 (지급)",
    "Agent Wallet Transfer (DEDUCT)": "에이전트 지갑 이체 (차감)",
    BNG: "부운고",
    CQ9: "씨큐9",
    DEPOSIT_APPROVED: "입금 승인",
    Evolution: "에볼루션",
    Evoplay: "에보플레이",
    JDB: "JDB",
    Joker: "조커",
    "Micro Gaming Slots": "마이크로게이밍 슬롯",
    "Oriental Gaming": "오리엔탈게임",
    "Oriental Slots": "오리엔탈게임 슬롯",
    "PG Soft": "PG소프트",
    "Play N Go": "플레이앤고",
    // Resolves via the per-code name (`pragmatic_casino`) from the approved list.
    "Pragmatic Play Live": "프라그마틱 카지노",
    "Pragmatic Slots": "프라그마틱 슬롯",
    "Pragmatic Slots - 최대 당첨금 초과 차감": "프라그마틱 슬롯 - 최대 당첨금 초과 차감",
    "User Withdrawal": "출금 신청",
    Wazdan: "와즈단",
    WITHDRAWAL_REJECTED: "출금 거절 (환불)",
    "World Match": "월드 매치",
    YGGDrasil: "위그드라실",
  };

  it.each(Object.entries(SEEN))("%s → %s", (value, expected) => {
    expect(label(value)).toBe(expected);
  });
});

describe("walletLogTransactionLabel — fallbacks", () => {
  it("returns unknown values unchanged and empty input as empty", () => {
    expect(label("SOME_NEW_TYPE")).toBe("SOME_NEW_TYPE");
    expect(label("Unknown Studio")).toBe("Unknown Studio");
    expect(label(null)).toBe("");
  });
});
