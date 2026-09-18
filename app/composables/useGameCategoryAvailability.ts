import { computed, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useGameCatalogStore } from "@/stores/game-catalog";
import { normalizeGameType } from "@/interfaces/game.interface";

/**
 * Warm-start cache for the resolved category set.
 *
 * The lobby read is a network round trip, but the rail and the mobile bar have
 * to draw immediately — so without a seed they render every category, then drop
 * the ones this deployment does not have a moment later. Rows vanishing under
 * the pointer is worse than a slightly stale list, and the set changes about as
 * often as the operator adds a provider. Same idiom, and the same reason, as the
 * theme warm-start in `app/lib/siteConfig.ts`.
 *
 * Keyed by host so a multi-tenant browser session never seeds one brand's rail
 * from another's.
 */
const CACHE_KEY_PREFIX = "gameCategories.v1";

/**
 * Warm-start cache for HOT, which needs its own answer.
 *
 * Separate key rather than a member of the category set: the set is "which
 * lobby types exist", and HOT is not a lobby type. Folding a curated-slice
 * answer into it would make the set mean two different things.
 */
const HOT_CACHE_KEY_PREFIX = "gameCategories.hot.v1";

/**
 * The cheapest question that answers "are there any hot games".
 *
 * `limit: 1` because only `total` is read — the rail never renders these rows.
 * The catalog store caches by query key and de-dupes in flight, so every nav
 * surface asking shares one request.
 */
const HOT_PROBE = {
  gameType: "slot",
  category: "hot",
  page: 1,
  limit: 1,
} as const;

function host(): string {
  return typeof window === "undefined"
    ? "_default"
    : window.location.hostname.toLowerCase();
}

function cacheKey(): string {
  return `${CACHE_KEY_PREFIX}:${host()}`;
}

function hotCacheKey(): string {
  return `${HOT_CACHE_KEY_PREFIX}:${host()}`;
}

/** The last resolved set, or null when nothing has been cached on this device. */
function readCache(): Set<string> | null {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(cacheKey());
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // A hand-edited or half-written entry must not blank the rail.
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return new Set(parsed.filter((t): t is string => typeof t === "string"));
  } catch {
    return null;
  }
}

/** The last known HOT answer, or null when this device has never resolved one. */
function readHotCache(): boolean | null {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(hotCacheKey());
    return raw === "1" ? true : raw === "0" ? false : null;
  } catch {
    return null;
  }
}

function writeHotCache(hasGames: boolean): void {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(hotCacheKey(), hasGames ? "1" : "0");
  } catch {
    // Ignore quota / private-mode errors: the cache is an optimisation.
  }
}

function writeCache(types: Set<string>): void {
  if (!import.meta.client || types.size === 0) return;
  try {
    localStorage.setItem(cacheKey(), JSON.stringify([...types]));
  } catch {
    // Ignore quota / private-mode errors: the cache is an optimisation.
  }
}

/** Shared category availability derived from the single unfiltered lobby list. */
export function useGameCategoryAvailability() {
  const authStore = useAuthStore();
  const catalog = useGameCatalogStore();
  const allLobbies = computed(() => catalog.lobbyEntry(null));

  // loadLobbies(null) waits for the initial session probe itself. Calling it
  // from multiple layout surfaces is harmless because the store de-dupes it.
  void catalog.loadLobbies(null).catch(() => undefined);

  // HOT is a curated slice of slot games rather than a lobby type, so the lobby
  // read above can never answer for it. It gets its own one-row probe, which the
  // store caches and de-dupes exactly like the lobby call.
  const hotGames = computed(() => catalog.gameEntry(HOT_PROBE));
  void catalog.loadGames(HOT_PROBE).catch(() => undefined);

  // Later member transitions need one authoritative member-scoped refresh.
  // Game visibility follows the same member restrictions as lobbies, so the HOT
  // probe is refreshed on the same transition.
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated, wasAuthenticated) => {
      if (authStore.sessionReady && isAuthenticated !== wasAuthenticated) {
        void catalog.loadLobbies(null, true).catch(() => undefined);
        void catalog.loadGames(HOT_PROBE, true).catch(() => undefined);
      }
    },
  );

  const loaded = computed(() => allLobbies.value.status === "success");

  /**
   * The read has finished, successfully or not.
   *
   * Callers stay permissive only while the answer is genuinely unknown (idle
   * or in flight) *and* no cached set exists. A *failed* read used to count as
   * unknown too, which left every category on screen for as long as the
   * request kept failing — so a deployment with no fishing or virtual lobbies
   * still advertised both, and the rows led to pages holding a section header
   * and nothing else. An error tells us nothing new, but it is not a reason to
   * keep advertising categories this deployment has never had.
   */
  const settled = computed(
    () =>
      allLobbies.value.status === "success" ||
      allLobbies.value.status === "error",
  );

  const liveTypes = computed(() => new Set(
    allLobbies.value.data
      .map((lobby) => normalizeGameType(lobby.gameType))
      .filter((type): type is string => Boolean(type)),
  ));

  // Read once per call site rather than on every `hasLobbies()` evaluation:
  // this runs for each item of each menu, on every re-render.
  const cachedTypes = ref<Set<string> | null>(readCache());

  // Refresh the seed whenever the live read lands, so the next paint on this
  // device starts from the truth. Writing only on success keeps a failed read
  // from erasing a good set.
  watch(
    () => allLobbies.value.status,
    (status) => {
      if (status !== "success") return;
      writeCache(liveTypes.value);
      cachedTypes.value = liveTypes.value;
    },
    { immediate: true },
  );

  /** The set to answer from: the live read once it lands, else the warm seed. */
  const types = computed(
    () => (settled.value ? liveTypes.value : cachedTypes.value ?? liveTypes.value),
  );

  const hotSettled = computed(
    () =>
      hotGames.value.status === "success" || hotGames.value.status === "error",
  );

  const liveHasHot = computed(() => (hotGames.value.data?.total ?? 0) > 0);

  const cachedHasHot = ref<boolean | null>(readHotCache());

  watch(
    () => hotGames.value.status,
    (status) => {
      if (status !== "success") return;
      writeHotCache(liveHasHot.value);
      cachedHasHot.value = liveHasHot.value;
    },
    { immediate: true },
  );

  /**
   * Whether HOT has at least one game behind it.
   *
   * Counts games, not lobbies — the opposite of `hasLobbies`, and deliberately
   * so: HOT is a curated `category=hot` slice of the slot list, so an operator
   * who has marked nothing hot leaves the row pointing at a page with a section
   * header and no grid. It was previously exempted from the filter entirely,
   * which is why it was the one category that always showed.
   *
   * Permissive while genuinely unknown, and answers from the warm seed until
   * the probe lands, so the row does not flicker out from under the pointer.
   */
  const hasHotGames = computed(() => {
    const known = hotSettled.value || cachedHasHot.value !== null;
    if (!known) return true;
    return hotSettled.value ? liveHasHot.value : cachedHasHot.value ?? true;
  });

  /**
   * Whether a category has at least one lobby behind it.
   *
   * Deliberately counts *lobbies*, not games: live-casino lobbies launch
   * directly and carry no sub-games, so a game-count test would hide a
   * fully-working category.
   */
  function hasLobbies(gameType: string): boolean {
    const known = settled.value || cachedTypes.value !== null;
    return !known || types.value.has(normalizeGameType(gameType) ?? gameType);
  }

  return { hasLobbies, hasHotGames, lobbyTypes: types, loaded, settled };
}
