<template>
  <GamePageLayout>
    <h1 class="sr-only">{{ $t('home.seo.pageTitles.virtual') }} - {{ siteConfig.identity.siteName }}</h1>
    <WorkInProgress />
  </GamePageLayout>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const siteConfig = useSiteConfig();

definePageMeta({
  layout: "default",
});

useHead({
  title: () =>
    `${t("home.seo.pageTitles.virtual")} — ${siteConfig.identity.siteName}`,
});
</script>
