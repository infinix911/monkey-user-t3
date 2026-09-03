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

function cacheKey(): string {
  const host =
    typeof window === "undefined" ? "_default" : window.location.hostname;
  return `${CACHE_KEY_PREFIX}:${host.toLowerCase()}`;
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

  // Later member transitions need one authoritative member-scoped refresh.
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated, wasAuthenticated) => {
      if (authStore.sessionReady && isAuthenticated !== wasAuthenticated) {
        void catalog.loadLobbies(null, true).catch(() => undefined);
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

  return { hasLobbies, lobbyTypes: types, loaded, settled };
}
