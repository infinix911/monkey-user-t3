<template>
  <!-- Inquiry is the one section with props; every other panel is self-driving.
       Both branches lived twice in NewProfileModal (desktop panel + mobile
       full-screen) and would have been a third copy in the sidebar. -->
  <InquiryContent v-if="section === 'inquiry'" :inquiry-data="inquiry.data.value"
    :on-refresh="inquiry.refresh" :on-page-change="onPageChange" :current-page="inquiry.page.value" />
  <component :is="component" v-else-if="component" />
</template>

<script setup lang="ts">
/**
 * Renders whichever "My Account" section is open, wherever it is being shown —
 * the mobile full-screen modal, or the desktop panel beside the sidebar.
 *
 * The section id resolves through `useAccountSections`, so there is one id →
 * component map for the whole app, and the inquiry list comes from the shared
 * `useInquiryFeed`, so switching surfaces does not refetch it.
 *
 * @prop {string | null} section - Section id to render; `null` renders nothing.
 */
import InquiryContent from "~/components/inquiry/InquiryContent.vue";
import { ACCOUNT_SECTION_COMPONENTS } from "@/composables/useAccountSections";

const props = defineProps<{
  /** Section id to render; `null` renders nothing. */
  section: string | null;
}>();

const inquiry = useInquiryFeed();

/** The panel for this section, or `null` when the id is unknown. */
const component = computed(() => {
  const id = props.section;
  if (!id || !(id in ACCOUNT_SECTION_COMPONENTS)) return null;
  return ACCOUNT_SECTION_COMPONENTS[
    id as keyof typeof ACCOUNT_SECTION_COMPONENTS
  ];
});

/**
 * Loads another page of inquiries.
 *
 * @param target - 1-based page to load.
 * @returns {Promise<void>} Resolves once the request settles.
 */
async function onPageChange(target: number): Promise<void> {
  await inquiry.load(target);
}

// Opening the inquiry section loads its first page. Owned here rather than by
// each host, so every surface that shows the section gets the data.
watch(
  () => props.section,
  (section) => {
    if (section === "inquiry") void inquiry.load(1);
  },
  { immediate: true },
);
</script>
