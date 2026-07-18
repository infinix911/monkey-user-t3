<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col gap-2">
      <div v-for="i in 4" :key="i" class="w-full aspect-[690/200] rounded-lg bg-[#3a3a3a] animate-pulse" />
    </div>

    <!-- Accordion List -->
    <div v-else-if="boards.length" class="flex flex-col gap-0">
      <div v-for="board in boards" :key="board.id" class="rounded-lg overflow-hidden bg-[#D6D6D6FF]"
        style="box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.5)">
        <div class="w-full aspect-[690/200] cursor-pointer" @click="toggle(board.id)">
          <NuxtImg :src="board.thumbnail" :alt="board.description"
            class="w-full h-full object-cover block !rounded-lg" />
        </div>
        <Transition name="accordion">
          <div v-if="expandedId === board.id" class="px-4 py-3 text-black text-sm whitespace-pre-line"
            style="background: rgba(214, 214, 214, 1)">
            {{ board.description }}
          </div>
        </Transition>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <p class="text-gray-400 text-base">{{ t("promotion.promotion") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useApi } from "@/composables/useApi";

interface IPromotionBoard {
  id: string;
  order: number;
  thumbnail: string;
  description: string;
}

const { t } = useI18n();
const boards = ref<IPromotionBoard[]>([]);
const expandedId = ref<string | null>(null);
const isLoading = ref(true);

const toggle = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const fetchBoards = async () => {
  isLoading.value = true;
  try {
    const api = useApi();
    boards.value = (await api<IPromotionBoard[]>("/promotions/boards")) || [];
  } catch (error) {
    console.error("Failed to fetch promotion boards:", error);
    boards.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchBoards();
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
