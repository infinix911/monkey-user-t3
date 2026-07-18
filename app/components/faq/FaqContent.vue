<template>
  <div class="py-6 font-medium">
    <div class="space-y-2">
      <div
        v-for="item in faqItems"
        :key="item.id"
        class="rounded-lg overflow-hidden bg-[#D6D6D6]"
      >
        <button
          :class="[
            'w-full flex items-center justify-between p-4 transition-colors duration-300',
            expandedFaq === item.id
              ? 'bg-[#285eff] rounded-b-[14px]'
              : 'bg-[#46506d]',
          ]"
          @click="toggleFaq(item.id)"
        >
          <span class="text-white text-left flex-1">
            {{ item.question }}
          </span>
          <div class="flex-shrink-0 ml-2 transition-transform duration-300">
            <svg
              v-if="expandedFaq === item.id"
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>
        <div
          :class="[
            'overflow-hidden transition-all duration-300 ease-in-out',
            expandedFaq === item.id
              ? 'max-h-96 opacity-100'
              : 'max-h-0 opacity-0',
          ]"
        >
          <div class="bg-gray-300 p-4 tiptap-content">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="text-black text-sm lg:text-base font-normal" v-html="renderTiptap(item.description)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useApi } from "@/composables/useApi";
import { renderTiptap } from "~/composables/useTiptap";

interface FaqConfigItem {
  title?: string;
  description?: string;
}

interface FaqItem {
  id: number;
  question: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  description: any;
}

const expandedFaq = ref<number | null>(null);
const faqItems = ref<FaqItem[]>([]);

const toggleFaq = (id: number) => {
  expandedFaq.value = expandedFaq.value === id ? null : id;
};

onMounted(async () => {
  try {
    const api = useApi();
    const body = await api<{ data?: FaqConfigItem[] } | FaqConfigItem[]>(
      "/site/config/userpage/faq",
    );
    const configData: FaqConfigItem[] = Array.isArray(body)
      ? body
      : (body?.data ?? []);
    faqItems.value = configData
      .filter((item): item is Required<FaqConfigItem> => !!item && !!item.title)
      .reverse()
      .map((item, idx) => ({
        id: idx + 1,
        question: item.title,
        description: item.description,
      }));
  } catch {
    // Silently fail — FAQ is optional
  }
});
</script>

<style>
.tiptap-content p {
  margin-bottom: 0.4rem;
}

.tiptap-content ul,
.tiptap-content ol {
  padding-left: 1.5rem;
  margin-bottom: 0.4rem;
}

.tiptap-content ol {
  list-style-type: decimal;
}

.tiptap-content ul {
  list-style-type: disc;
}

.tiptap-content a {
  color: #2563eb;
  text-decoration: underline;
}

.tiptap-content blockquote {
  border-left: 3px solid #9ca3af;
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: #4b5563;
}

.tiptap-content hr {
  border-color: #9ca3af;
  margin: 0.75rem 0;
}
</style>
