<template>
  <GamePageLayout>
    <h1 class="sr-only">{{ $t('home.seo.pageTitles.casino') }} - {{ siteConfig.identity.siteName }}</h1>

    <!-- Loading State -->
    <div v-if="isLoading" class="w-full py-8 text-white text-center">
      <p class="text-lg text-gray-400">{{ $t("common.loading") }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="w-full py-8 text-white text-center">
      <p class="text-lg text-red-400">{{ error }}</p>
      <button
        class="mt-4 px-6 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 transition-colors"
        @click="() => fetchLobbies()"
      >
        {{ $t("common.retry") }}
      </button>
    </div>

    <!-- Provider Lobbies Grid -->
    <div
      v-else-if="providers.length > 0"
      class="w-full max-w-[1300px] mx-auto mb-[2rem] lg:px-0 mt-[10px] sm:mt-[8px]"
    >
      <div
        class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-[5px]"
      >
        <HomeGameCard
          v-for="provider in providers"
          :key="provider.id"
          :game="provider"
          game-type="casino"
          fluid
          aspect="240 / 313.04"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="w-full py-12 text-white text-center">
      <p class="text-lg text-gray-400">{{ $t("common.noProviders") }}</p>
    </div>
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { isLoading, error, lobbies, fetchLobbies } = useLobbyPage("casino");
const siteConfig = useSiteConfig();

// Build cards from local assets the same way the homepage does (see
// app/pages/index.vue `toCard`): logo/character art keyed by lobby id, with
// a shared per-section background + frame from siteConfig.
const providers = computed(() => {
  const logoBase = siteConfig.assets.homepage.gameLogos.casino;
  const charBase = siteConfig.assets.homepage.gameCharacters.casino;
  const charOverrides = siteConfig.assets.homepage.gameCharacterOverrides.casino;
  const bg = siteConfig.assets.homepage.gameBg.casino;
  const frame = siteConfig.assets.homepage.gameFrame.casino;
  return (lobbies.value ?? []).map((l: { id: string | number; game_name?: string }, i: number) => ({
    id: l.id,
    name: l.game_name ?? "",
    logo: lobbyLogoUrl(logoBase, l.id),
    character: resolveLobbyCharacter(charBase, "casino", i, l.id, charOverrides),
    bgImage: bg,
    frameImage: frame || undefined,
  }));
});

definePageMeta({
  layout: "default",
});

useSeoHead({
  title: t("home.seo.pageTitles.casino"),
  description: t("home.seo.pageDescriptions.casino"),
});
useBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Casino", path: "/casino" },
]);
useItemListSchema(() => providers.value.map((p) => ({ name: p.name })));
</script>
