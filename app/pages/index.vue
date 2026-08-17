<template>
  <div>
    <!-- Single root wrapper: the page renders GamePageLayout AND the sibling
       transaction tickers below it; the global page <Transition> needs one
       root element to animate. A bare block div adds no layout/stacking. -->
    <GamePageLayout>
      <!-- Every section is gated on its own row having content: a header bar
           with no cards under it reads as a broken section, so an empty
           category is dropped entirely rather than shown empty. -->
      <!-- HOT section -->
      <template v-if="hotGames.length > 0">
      <GameSectionHeader name="hot" :label="$t('navbar.hot')" />
      <!-- All HOT cards render directly; the first row loads eagerly and the
         rest defer via native `loading="lazy"` on the card image. Native lazy
         reliably loads on horizontal carousel scroll AND pagination, unlike the
         previous IntersectionObserver mount-gating which left off-screen cards
         stuck as gray skeletons.

         Card width shows exactly 6 per row and no 7th sliver: the 1202px
         content column less the five 6px `gap-1.5` gutters, over 6 —
         (1202 - 30) / 6 = 195.3, floored to 195 so the row totals 1200 and
         the 7th card starts past the column edge. `step` is one card plus its
         gutter (195 + 6). Re-derive both if the content column or the gap
         changes. Every row on this page uses the same figures.

         Below `xl` the width is container-relative instead, so the row is flush
         at both ends at any width without restating the page's padding here:
         three cards plus their two 6px gutters below `md` ((100cqw - 12px) / 3),
         and FIVE plus their four gutters from `md` ((100cqw - 24px) / 5) — the
         tablet rule, covering the iPad mini's 768px and the iPad Pro's 1024px
         alike. The fixed 195px used to start at `md`, which left 3.9 cards in
         view on a mini; five full cards read as a proper grid on both.

         `cqw` measures the CAROUSEL, so from `lg` — where the left rail claims
         210px + the 28px gap — the five cards divide the narrower content
         column, not the viewport. That is the point of the container query. -->

      <GameCarousel :step="201" :per-page="6">
        <div v-for="(game, idx) in hotGames" :key="game.id"
          class="flex-shrink-0 w-[calc((100cqw_-_12px)/3)] md:w-[calc((100cqw_-_24px)/5)] xl:w-[195px]">
          <HotGameCard :game="game" :eager="idx < FIRST_ROW_COUNT" :priority="idx < 3" fluid aspect="240 / 313.04"
            @click="handleGameClick(game)" />
        </div>
      </GameCarousel>
      </template>

      <!-- Slot section -->
      <template v-if="slotProviders.length > 0">
      <GameSectionHeader name="slots" :label="$t('navbar.slot')" />
      <GameCarousel :step="201" :per-page="6">
        <div v-for="provider in slotProviders" :key="`slot-${provider.id}`"
          class="flex-shrink-0 w-[calc((100cqw_-_12px)/3)] md:w-[calc((100cqw_-_24px)/5)] xl:w-[195px]">
          <HomeGameCard :game="provider" game-type="slot" fluid aspect="240 / 313.04" />
        </div>
      </GameCarousel>
      </template>

      <!-- Casino section -->
      <template v-if="casinoProviders.length > 0">
      <GameSectionHeader name="casino" :label="$t('navbar.casino')" />
      <GameCarousel :step="201" :per-page="6">
        <div v-for="provider in casinoProviders" :key="`casino-${provider.id}`"
          class="flex-shrink-0 w-[calc((100cqw_-_12px)/3)] md:w-[calc((100cqw_-_24px)/5)] xl:w-[195px]">
          <HomeGameCard :game="provider" game-type="casino" fluid aspect="240 / 313.04" />
        </div>
      </GameCarousel>
      </template>

      <!-- Sports section -->
      <template v-if="sportsProviders.length > 0">
      <GameSectionHeader name="sports" :label="$t('navbar.sports')" />
      <GameCarousel :step="201" :per-page="6">
        <div v-for="provider in sportsProviders" :key="`sports-${provider.id}`"
          class="flex-shrink-0 w-[calc((100cqw_-_12px)/3)] md:w-[calc((100cqw_-_24px)/5)] xl:w-[195px]">
          <HomeGameCard :game="provider" game-type="sports" fluid aspect="240 / 313.04" />
        </div>
      </GameCarousel>
      </template>

      <!-- Mini Games section -->
      <template v-if="miniGames.length > 0">
      <GameSectionHeader name="mini" :label="$t('navbar.mini')" />
      <GameCarousel :step="201" :per-page="6">
        <div v-for="game in miniGames" :key="`mini-${game.id}`"
          class="flex-shrink-0 w-[calc((100cqw_-_12px)/3)] md:w-[calc((100cqw_-_24px)/5)] xl:w-[195px]">
          <HotGameCard :game="game" fluid aspect="240 / 313.04" @click="handleGameClick(game)" />
        </div>
      </GameCarousel>
      </template>

      <!-- Loading State -->
      <div v-if="isLoading" class="w-full py-8 text-white text-center relative z-10">
        <p class="text-lg text-gray-400">{{ $t("home.loading") }}</p>
      </div>
    </GamePageLayout>

    <!-- Top Withdrawals & Top Deposits tickers — rendered outside
       GamePageLayout so they sit on the page background, not inside the
       game-grid card. -->
    <!-- Temporarily hidden: Top Withdrawals & Top Deposits tickers
  <div class="relative z-10 w-full flex justify-center pb-8 px-3 sm:px-4">
    <section class="w-full max-w-[1152px] grid grid-cols-1 md:grid-cols-2 gap-4">
      <TopTransactionsTicker
        :title="$t('home.sections.topWithdrawals')" endpoint="/site/top/withdrawals"
        cache-key="top-withdrawals" :fallback="fallbackTopWithdrawals" />
      <TopTransactionsTicker
        :title="$t('home.sections.topDeposits')" endpoint="/site/top/deposits"
        cache-key="top-deposits" :fallback="fallbackTopDeposits" />
    </section>
  </div>
  -->
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { openGame } from "~~/utils/game-navigation";
// Temporarily hidden with the Top Withdrawals/Deposits tickers (see template).
// Restore these imports when the tickers are re-enabled.
// import {
//   fallbackTopDeposits,
//   fallbackTopWithdrawals,
// } from "~~/utils/top-transactions-fallback";
// import TopTransactionsTicker from "~/components/site/TopTransactionsTicker.vue";
import { stripGamePayload } from "~/utils/strip-game-payload";
import {
  mapGameLobby,
  mapGameListItem,
  type GameLobbyWire,
  type GameListItemWire,
  type NormalizedLobby,
} from "@/interfaces/game.interface";

const authStore = useAuthStore();
const uiStore = useUiStore();

// Cards in the first visible row across breakpoints (3 mobile, 4 md, 6 lg) —
// these get loading="eager" so the browser doesn't defer their fetch. Reduced
// from 18 to 6 because slot provider CDNs (e.g. slots.ps9launcher.com) take
// 9-24s per image from Indonesia on Cable bandwidth (real WebPageTest data,
// 2026-05-07): 18 simultaneous third-party requests balloon LCP to ~6s. With
// 6 eager, only the first visible row loads up front; everything below the
// fold defers via native loading="lazy" as the user scrolls.
const FIRST_ROW_COUNT = 6;

definePageMeta({
  layout: "default",
});

const { tm, rt } = useI18n();

useSeoHead();
useOrganizationSchema();
useWebsiteSchema();
useBreadcrumbSchema([{ name: "Home", path: "/" }]);
useFaqSchema(
  normalizeFaqSchemaItems(tm("home.faq.items"), (message) =>
    rt(message as string),
  ),
);

const _router = useRouter();
const siteConfig = useSiteConfig();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleGameClick = (game: any) => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  const gameType = game.game_type || "slot";
  const lobbyId = game.lobby_id || "";
  authStore.setCurrentGame({
    id: String(game.id),
    name: game.game_name_en || game.name || "",
    provider: game.lobby || "",
    type: gameType,
    lobby_id: lobbyId,
  });
  const url = lobbyId
    ? `/${gameType}/${game.id}?lobbyId=${encodeURIComponent(lobbyId)}`
    : `/${gameType}/${game.id}`;
  openGame(url, { gameName: game.game_name_en || game.name || "" });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyList = any[];
type RemoteResponse = AnyList | { data?: AnyList } | null | undefined;

// The homepage is best-effort (fetches use `.catch(() => null)`), so we
// normalize defensively via the mappers rather than validateResponse — a
// malformed/absent payload degrades to an empty row instead of throwing.
const unwrap = (res: RemoteResponse): AnyList => {
  const arr = Array.isArray(res)
    ? res
    : res && typeof res === "object" && Array.isArray((res as { data?: AnyList }).data)
      ? (res as { data: AnyList }).data
      : [];
  return arr.map((it) => mapGameListItem(it as GameListItemWire));
};

// Single SSR backend call for the only section the homepage renders (hot
// games). Baked into the HTML payload so SPA navigations back to `/` rehydrate
// without a refetch.
const api = useApi();

// Fetches are kicked off WITHOUT await here so they run concurrently; a single
// `await Promise.all([...])` after the mini-games block (below) blocks SSR until
// all resolve. TTFB ≈ slowest single call instead of the sum of every RTT.
const hotGamesAsync = useAsyncData<AnyList>(
  "home-hot-games",
  async () => {
    const res = await api<RemoteResponse>("/games", {
      query: { gameType: "slot", category: "hot", page: 1, limit: 48 },
    }).catch(() => null as unknown as RemoteResponse);
    // Drop fields the UI never reads (e.g. game_name_ko) before they're baked
    // into the SSR payload. See utils/strip-game-payload.ts.
    return stripGamePayload(unwrap(res));
  },
  { default: (): AnyList => [] },
);
const { data: hotGamesData, error: fetchError } = hotGamesAsync;

const isLoading = computed(
  () => hotGamesData.value == null && !fetchError.value,
);

const hotGames = computed<AnyList>(() => hotGamesData.value ?? []);

// Casino + Sports + Slot lobbies — same `/games/lobbies?game_type=...` endpoint
// the dedicated /casino and /sports pages use (see useLobbyPage.ts), so
// SSR-cached payloads are shared across pages.
interface LobbyCard {
  id: string | number;
  /** Provider code — HomeGameCard names the logo file after it. */
  code?: string | null;
  name: string;
  logo: string;
  character: string;
  bgImage: string;
  frameImage?: string;
}
type LobbyApiResponse =
  | GameLobbyWire[]
  | { data?: GameLobbyWire[] }
  | null
  | undefined;

const unwrapLobbies = (res: LobbyApiResponse): NormalizedLobby[] => {
  const arr = Array.isArray(res)
    ? res
    : res && typeof res === "object" && Array.isArray(res.data)
      ? res.data
      : [];
  return arr.map((it) => mapGameLobby(it as GameLobbyWire));
};

// One fetcher for the three identical lobby reads (only `game_type` differs).
const fetchLobbies = (key: string, gameType: string) =>
  useAsyncData<NormalizedLobby[]>(
    key,
    async () => {
      const res = await api<LobbyApiResponse>("/games/lobbies", {
        query: { gameType },
      }).catch(() => null);
      return unwrapLobbies(res);
    },
    { default: () => [] as NormalizedLobby[] },
  );

// Keys match the dedicated /casino, /sports, /slots pages (useLobbyPage.ts uses
// `lobbies-${gameType}`) so the SSR payload is shared — navigating home->/casino
// reuses the cached read instead of refetching the same endpoint.
const casinoLobbiesAsync = fetchLobbies("lobbies-casino", "casino");
const sportsLobbiesAsync = fetchLobbies("lobbies-sport", "sport");
const slotLobbiesAsync = fetchLobbies("lobbies-slot", "slot");
const { data: casinoLobbiesData } = casinoLobbiesAsync;
const { data: sportsLobbiesData } = sportsLobbiesAsync;
const { data: slotLobbiesData } = slotLobbiesAsync;

// Mini games — unlike the lobby-card rows above, the mini row shows individual
// games: each mini lobby is expanded into its games and flattened (mirrors the
// /mini page). Rendered in a single horizontal scroll row like the HOT section.
const miniGamesAsync = useAsyncData<AnyList>(
  "home-mini-games",
  async () => {
    const lobbies = unwrapLobbies(
      await api<LobbyApiResponse>("/games/lobbies", {
        query: { gameType: "mini" },
      }).catch(() => null),
    );
    if (lobbies.length === 0) return [];
    const gamesResults = await Promise.all(
      lobbies.map((lobby) =>
        api<RemoteResponse>("/games", {
          query: { lobby: lobby.game_name, page: 1, limit: 50 },
        }).catch(() => null as unknown as RemoteResponse),
      ),
    );
    const flat: AnyList = [];
    for (const res of gamesResults) flat.push(...unwrap(res));
    // Drop fields the UI never reads (e.g. game_name_ko) before they're baked
    // into the SSR payload. See utils/strip-game-payload.ts.
    return stripGamePayload(flat);
  },
  { default: (): AnyList => [] },
);
const { data: miniGamesData } = miniGamesAsync;

// Single SSR-blocking await: all six homepage reads resolve concurrently.
await Promise.all([
  hotGamesAsync,
  casinoLobbiesAsync,
  sportsLobbiesAsync,
  slotLobbiesAsync,
  miniGamesAsync,
]);

const miniGames = computed<AnyList>(() => miniGamesData.value ?? []);

/**
 * Sections whose logo files have been renamed from the lobby UUID to the
 * provider code (`<gameProvider>.webp`) — the code is stable across
 * deployments, where the same provider carries a different lobby id in each.
 * `sport-logo` is still keyed by id, so it is deliberately not in this set;
 * add it once those files are renamed too. Lobbies with no code keep the
 * id-named file either way.
 */
const CODE_KEYED_LOGOS = new Set(["casino", "slot"]);

// Local logos + character art live at paths declared in
// `siteConfig.assets.homepage.gameLogos.{casino,sports}` and
// `siteConfig.assets.homepage.gameCharacters.{casino,sports}` (see
// docs/CASINO_GAMES.md). Character art stays keyed by the lobby UUID.
// Skipping the API's `logo_path` keeps the homepage off the external CDN —
// faster paint, no extra network dependency.
const toCard = (
  l: NormalizedLobby,
  index: number,
  gameType: "casino" | "sports" | "slot",
  logoBase: string,
  characterBase: string,
  bgImage: string,
  frameImage?: string,
  characterOverrides?: Record<string, string>,
): LobbyCard => ({
  id: l.id,
  code: l.gameProvider,
  name: l.game_name ?? "",
  logo: lobbyLogoUrl(
    logoBase,
    (CODE_KEYED_LOGOS.has(gameType) && l.gameProvider) || l.id,
  ),
  character: resolveLobbyCharacter(
    characterBase,
    gameType,
    index,
    l.id,
    characterOverrides,
  ),
  bgImage,
  frameImage: frameImage || undefined,
});

const casinoProviders = computed<LobbyCard[]>(() => {
  const logoBase = siteConfig.assets.homepage.gameLogos.casino;
  const charBase = siteConfig.assets.homepage.gameCharacters.casino;
  const charOverrides = siteConfig.assets.homepage.gameCharacterOverrides.casino;
  const bg = siteConfig.assets.homepage.gameBg.casino;
  const frame = siteConfig.assets.homepage.gameFrame.casino;
  return (casinoLobbiesData.value ?? []).map((l, i) =>
    toCard(l, i, "casino", logoBase, charBase, bg, frame, charOverrides),
  );
});
const sportsProviders = computed<LobbyCard[]>(() => {
  const logoBase = siteConfig.assets.homepage.gameLogos.sports;
  const charBase = siteConfig.assets.homepage.gameCharacters.sports;
  const charOverrides = siteConfig.assets.homepage.gameCharacterOverrides.sports;
  const bgDefault = siteConfig.assets.homepage.gameBg.sport;
  const bgRatio = siteConfig.assets.homepage.gameBg.sportRatio;
  const frame = siteConfig.assets.homepage.gameFrame.sport;
  const ratioIds = new Set(siteConfig.assets.homepage.ratioSportIds);
  return (sportsLobbiesData.value ?? []).map((l, i) =>
    toCard(
      l,
      i,
      "sports",
      logoBase,
      charBase,
      ratioIds.has(String(l.id)) ? bgRatio : bgDefault,
      frame,
      charOverrides,
    ),
  );
});

const slotProviders = computed<LobbyCard[]>(() => {
  const logoBase = siteConfig.assets.homepage.gameLogos.slot;
  const charBase = siteConfig.assets.homepage.gameCharacters.slot;
  const charOverrides = siteConfig.assets.homepage.gameCharacterOverrides.slot;
  const bg = siteConfig.assets.homepage.gameBg.slot;
  const frame = siteConfig.assets.homepage.gameFrame.slot;
  return (slotLobbiesData.value ?? []).map((l, i) =>
    toCard(l, i, "slot", logoBase, charBase, bg, frame, charOverrides),
  );
});

// Currently unused (underscore prefix), kept as a deployment-currency-aware
// helper in case Schema.org / JSON-LD pricing is added back later.
const _currency = useCurrency();
const _formatCurrency = (amount: number): string => _currency.format(amount);
</script>
