<template>
  <div>
    <slot />
    <InquiryModal
      v-if="uiStore.showInquiryModal"
      :is-open="uiStore.showInquiryModal"
      @close="uiStore.setShowInquiryModal(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const uiStore = useUiStore();
useUnreadInquiryGate();

const InquiryModal = defineAsyncComponent(
  () => import("@/components/inquiry/InquiryModal.vue"),
);

defineOptions({
  name: "GameLayout",
});
</script>
