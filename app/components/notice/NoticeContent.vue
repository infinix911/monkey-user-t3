<template>
  <div class="py-6 font-medium">
    <p v-if="!loading && notices.length === 0" class="text-center text-white/60 py-8">
      {{ $t("notice.empty") }}
    </p>

    <div class="space-y-2">
      <div
        v-for="item in notices"
        :key="item.id"
        class="tm-card rounded-lg overflow-hidden"
      >
        <button
          :class="[
            'w-full flex items-center justify-between p-4 transition-colors duration-300',
            expanded === item.id
              ? 'tm-thead rounded-b-[14px]'
              : 'tm-row tm-row-hover cursor-pointer',
          ]"
          @click="toggle(item.id)"
        >
          <span class="text-white text-left flex-1">
            {{ item.title }}
          </span>
          <div class="flex-shrink-0 ml-2 transition-transform duration-300">
            <svg
              v-if="expanded === item.id"
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
            expanded === item.id
              ? 'max-h-[60vh] overflow-y-auto opacity-100'
              : 'max-h-0 opacity-0',
          ]"
        >
          <div class="p-4 tiptap-content">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              class="text-white/85 text-sm lg:text-base font-normal"
              v-html="renderTiptap(item.content)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * NoticeContent — the notices list behind the sidebar's 공지사항 entry.
 *
 * One accordion row per notice: the CMS title is the header, the rich-text
 * body the panel. Deliberately the same card/row styling as the other account
 * panels so the section does not read as a different surface.
 *
 * Distinct from `NoticeSection.vue`, which is the *post-login modal* showing
 * the single site notice. Both come from `cms_user_notice`, told apart by the
 * `scope` flag: this list is `board`, that modal is `site`.
 */
import { ref, onMounted } from "vue";
import { useApi } from "@/composables/useApi";
import { renderTiptap } from "~/composables/useTiptap";

interface NoticeDto {
  title?: string;
  content?: string;
}

interface NoticeItem {
  id: number;
  title: string;
  content: string;
}

const expanded = ref<number | null>(null);
const notices = ref<NoticeItem[]>([]);
const loading = ref(true);

/**
 * Expand one notice, collapsing whichever was open.
 *
 * @param id - Row id within the rendered list.
 */
const toggle = (id: number) => {
  expanded.value = expanded.value === id ? null : id;
};

onMounted(async () => {
  try {
    const api = useApi();
    const body = await api<{ data?: NoticeDto[] } | NoticeDto[]>("/site/notices");
    const rows: NoticeDto[] = Array.isArray(body) ? body : (body?.data ?? []);
    notices.value = rows
      .filter((row): row is Required<NoticeDto> => !!row && !!row.title)
      .map((row, idx) => ({
        id: idx + 1,
        title: row.title,
        content: row.content ?? "",
      }));
    // Open the first notice: with a short list, landing on all-collapsed rows
    // makes the panel look empty.
    expanded.value = notices.value.length > 0 ? 1 : null;
  } catch {
    // Silently fail — the panel renders its empty state.
  } finally {
    loading.value = false;
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
  color: var(--tm-accent);
  text-decoration: underline;
}

.tiptap-content blockquote {
  border-left: 3px solid color-mix(in srgb, var(--tm-accent) 60%, transparent);
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: color-mix(in srgb, var(--tm-input-text) 55%, transparent);
}

.tiptap-content hr {
  border-color: color-mix(in srgb, var(--tm-input-border) 45%, transparent);
  margin: 0.75rem 0;
}
</style>
