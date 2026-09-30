<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col gap-2">
      <div v-for="i in 4" :key="i" class="tm-card w-full aspect-[690/200] rounded-lg animate-pulse" />
    </div>

    <!-- Accordion List -->
    <div v-else-if="boards.length" class="flex flex-col gap-0">
      <div v-for="board in boards" :key="board.id" class="tm-card rounded-lg overflow-hidden"
        style="box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.5)">
        <div class="w-full aspect-[690/200] cursor-pointer" @click="toggle(board.id)">
          <img :src="board.thumbnail" :alt="board.description"
            class="w-full h-full object-cover block !rounded-lg" />
        </div>
        <Transition name="accordion">
          <div v-if="expandedId === board.id" class="px-4 py-3 text-white/85 text-sm whitespace-pre-line">
            {{ board.description }}
          </div>
        </Transition>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <p class="tm-muted text-base">{{ t("promotion.promotion") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { loadPromotionBoards, usePromotionBoards } from "~/composables/usePromotionBoards";

const { t } = useI18n();
// Shared cache: the modal/panel prefetch it before opening, so a mount
// normally finds the boards already there and never shows the skeleton.
const { boards, isLoading } = usePromotionBoards();
const expandedId = ref<string | null>(null);

const toggle = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id;
};

// Background refresh — keeps the list current without re-showing the skeleton.
onMounted(() => {
  loadPromotionBoards();
});
</script>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.25s ease;
  overflow: hidden;
  max-height: 500px;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
