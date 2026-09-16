/**
 * Cached member-record entries must stay reactive (BUG: Activity modal spins
 * forever on its first open).
 *
 * `member-records`' generic `load()` created a missing entry with
 * `collection[key] ??= entry<T>()`. The assignment goes through the reactive
 * proxy, but the VALUE of a logical-assignment expression is the raw object
 * that was assigned, not the proxy Vue hands back on the next read. Every
 * later mutation (`status = "loading"` → `"success"` / `"error"`, `data = …`)
 * therefore wrote to the raw target and skipped the proxy's set trap, so a
 * `computed` that had already read the (missing) key never re-evaluated.
 *
 * ActivityContent is where that surfaces: its modal is `v-if`, so the
 * component mounts fresh on every open and its `loading` computed is created
 * BEFORE the entry exists. First open → spinner forever; close and reopen →
 * a brand-new computed reads the by-then-successful entry and renders.
 *
 * These tests exercise the store through a computed created before the fetch,
 * which is the only arrangement that catches the defect.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, isReactive, nextTick, toRaw } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const apiMock = vi.fn();

vi.mock("@/composables/useApi", () => ({
  useApi: () => apiMock,
  /** validateResponse throws this; the store only needs a real Error subclass. */
  ApiValidationError: class ApiValidationError extends Error {
    constructor(request: string) {
      super(`Invalid response from ${request}`);
      this.name = "ApiValidationError";
    }
  },
}));

const { useMemberRecordsStore } = await import("@/stores/member-records");

const PAGE_SIZE = 50;
/** The key ActivityContent builds by hand, mirrored here on purpose. */
const KEY = `activity:category=all&limit=${PAGE_SIZE}&page=1`;

/** A promise the test settles by hand, to hold the request in flight. */
function defer<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const wirePayload = (total = 1) => ({
  data: [
    {
      id: 161287,
      createdAt: "2026-09-17T10:00:00.000Z",
      type: "transaction",
      transaction: "DEPOSIT_APPROVED",
      transactionId: "tx-1",
      debit: "0.0000",
      credit: "50000.0000",
      walletAfter: "50000.0000",
    },
  ],
  meta: { total, page: 1, limit: PAGE_SIZE, totalPages: 1 },
});

describe("member-records cached entries stay reactive", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("clears a spinner that was already rendered against the in-flight entry", async () => {
    const deferred = defer<unknown>();
    apiMock.mockReturnValue(deferred.promise);
    const store = useMemberRecordsStore();

    // Created before the entry exists — exactly what ActivityContent's fresh
    // mount does.
    const activityEntry = computed(() => store.activities[KEY]);
    const loading = computed(
      () => !activityEntry.value || activityEntry.value.status === "loading",
    );
    expect(loading.value).toBe(true);

    const pending = store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE });

    // The paint that shows the spinner: `loading` is re-read while the request
    // is in flight, so it now tracks `status` ON THE ENTRY. Every later write
    // has to go through the entry's proxy or this computed never wakes up.
    await nextTick();
    expect(loading.value).toBe(true);

    deferred.resolve(wirePayload());
    await pending;
    await nextTick();

    expect(loading.value).toBe(false);
    expect(activityEntry.value?.status).toBe("success");
    expect(activityEntry.value?.data?.rows).toBe(1);
    expect(activityEntry.value?.data?.data).toHaveLength(1);
  });

  it("clears that same rendered spinner on a rejected request, with the error readable", async () => {
    const deferred = defer<unknown>();
    apiMock.mockReturnValue(deferred.promise);
    const store = useMemberRecordsStore();

    const activityEntry = computed(() => store.activities[KEY]);
    const loading = computed(
      () => !activityEntry.value || activityEntry.value.status === "loading",
    );
    expect(loading.value).toBe(true);

    const pending = store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE });
    await nextTick();
    expect(loading.value).toBe(true);

    deferred.reject(new Error("401 Unauthorized"));
    await pending;
    await nextTick();

    // The defect's worst face: a failed first open must not spin forever.
    expect(loading.value).toBe(false);
    expect(activityEntry.value?.status).toBe("error");
    expect(activityEntry.value?.error).toBe("401 Unauthorized");
    expect(activityEntry.value?.data).toBeNull();
  });

  it("writes under the key ActivityContent computes", async () => {
    apiMock.mockResolvedValue(wirePayload());
    const store = useMemberRecordsStore();

    await store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE });

    expect(Object.keys(store.activities)).toEqual([KEY]);
    expect(apiMock).toHaveBeenCalledWith("/transactions/activity/all", {
      query: { page: 1, limit: PAGE_SIZE },
    });
  });

  it("fires exactly one request per category/page and serves the rest from cache", async () => {
    apiMock.mockResolvedValue(wirePayload());
    const store = useMemberRecordsStore();

    // Concurrent (in-flight dedupe) …
    await Promise.all([
      store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE }),
      store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE }),
    ]);
    // … and sequential (success short-circuit), i.e. a reopen of the modal.
    await store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE });
    expect(apiMock).toHaveBeenCalledTimes(1);

    // A different page is a different key and does fetch.
    await store.loadActivity({ category: "all", page: 2, limit: PAGE_SIZE });
    expect(apiMock).toHaveBeenCalledTimes(2);

    // …and `force` still refetches, which the panels' refresh buttons rely on.
    await store.loadActivity({ category: "all", page: 2, limit: PAGE_SIZE }, true);
    expect(apiMock).toHaveBeenCalledTimes(3);
  });

  it("re-fetches after a failure instead of latching the error entry", async () => {
    apiMock.mockRejectedValueOnce(new Error("boom"));
    apiMock.mockResolvedValue(wirePayload(2));
    const store = useMemberRecordsStore();

    const activityEntry = computed(() => store.activities[KEY]);
    await store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE });
    expect(activityEntry.value?.status).toBe("error");

    await store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE });
    await nextTick();
    expect(activityEntry.value?.status).toBe("success");
    expect(activityEntry.value?.error).toBeNull();
    expect(activityEntry.value?.data?.rows).toBe(2);
  });

  it("never hands the fetcher a raw, unproxied entry to mutate", async () => {
    apiMock.mockResolvedValue(wirePayload());
    const store = useMemberRecordsStore();
    await store.loadActivity({ category: "all", page: 1, limit: PAGE_SIZE });

    // The regression in one line: what `load()` writes through has to be the
    // reactive proxy, not the raw object the seeding assignment evaluated to.
    const held = store.activities[KEY]!;
    expect(isReactive(held)).toBe(true);
    expect(toRaw(held)).not.toBe(held);
  });

  it("keeps the single-entry (referrals) path reactive too", async () => {
    apiMock.mockResolvedValue([]);
    const store = useMemberRecordsStore();

    const loading = computed(
      () =>
        store.referrals.status === "idle" || store.referrals.status === "loading",
    );
    expect(loading.value).toBe(true);

    await store.loadReferrals();
    await nextTick();

    expect(loading.value).toBe(false);
    expect(store.referrals.status).toBe("success");
  });
});

const activityContent = readFileSync(
  resolve(__dirname, "../../app/components/activity/ActivityContent.vue"),
  "utf8",
);

describe("ActivityContent's view of the cache", () => {
  it("builds the key the store actually writes under", () => {
    // Hand-built on the component side, `keyOf()`-built on the store side: a
    // mismatch would leave `activityEntry` permanently undefined, which
    // `loading` reads as a spinner with no error path at all.
    expect(activityContent).toContain(
      "`activity:category=${activeTab.value}&limit=${PAGE_SIZE}&page=${currentPage.value}`",
    );
  });

  it("gives a failed load an error face with a retry, not the empty ledger", () => {
    expect(activityContent).toContain(
      'const hasError = computed(() => activityEntry.value?.status === "error");',
    );
    expect(activityContent).toContain(
      '{{ hasError ? t("common.errorLoadingData") : t("activity.empty") }}',
    );
    expect(activityContent).toContain('@click="fetchActivity(activeTab, currentPage)"');
  });

  it("still fetches exactly once on mount", () => {
    expect(activityContent.match(/fetchActivity\(activeTab\.value, 1\)/g)).toHaveLength(1);
    expect(activityContent.match(/onMounted\(/g)).toHaveLength(1);
  });
});
