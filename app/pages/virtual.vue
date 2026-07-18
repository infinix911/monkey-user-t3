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

useSeoHead({
  title: t("home.seo.pageTitles.virtual"),
  description: t("home.seo.pageDescriptions.virtual"),
});
useBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Virtual", path: "/virtual" },
]);
</script>
