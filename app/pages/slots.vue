<template>
  <GamePageLayout>
    <h1 class="sr-only">{{ $t('home.seo.pageTitles.slots') }} - {{ siteConfig.identity.siteName }}</h1>

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
          game-type="slot"
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
const { isLoading, error, lobbies, fetchLobbies } = useLobbyPage("slot");
const siteConfig = useSiteConfig();

// Build layered cards (bg + character + frame + logo) from local assets the
// same way /casino does — logo/character art keyed by lobby id, with a shared
// slot background + frame from siteConfig.
const providers = computed(() => {
  const logoBase = siteConfig.assets.homepage.gameLogos.slot;
  const charBase = siteConfig.assets.homepage.gameCharacters.slot;
  const charOverrides = siteConfig.assets.homepage.gameCharacterOverrides.slot;
  const bg = siteConfig.assets.homepage.gameBg.slot;
  const frame = siteConfig.assets.homepage.gameFrame.slot;
  return (lobbies.value ?? []).map(
    (l: { id: string | number; game_name?: string }, i: number) => ({
      id: l.id,
      name: l.game_name ?? "",
      logo: lobbyLogoUrl(logoBase, l.id),
      character: resolveLobbyCharacter(charBase, "slot", i, l.id, charOverrides),
      bgImage: bg,
      frameImage: frame || undefined,
    }),
  );
});

definePageMeta({
  layout: "default",
});

useSeoHead({
  title: t("home.seo.pageTitles.slots"),
  description: t("home.seo.pageDescriptions.slots"),
});
useBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Slots", path: "/slots" },
]);
useItemListSchema(() => providers.value.map((p) => ({ name: p.name })));
</script>
