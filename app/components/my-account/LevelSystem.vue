<template>
  <div class="h-full overflow-y-auto mt-5">
    <!-- Level Status Banner -->
    <div
      class="bg-[#121212] rounded-lg p-4 mb-6 flex items-center gap-4 border border-[#285eff]"
    >
      <div
        class="h-[3rem] w-[3rem] rounded-full flex items-center justify-center text-white font-bold shrink-0"
      >
        <NuxtImg
          :src="imagePath"
          :alt="levelName"
          width="90"
          height="90"
          class="object-contain"/>
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-2">
          <span
            class="text-white font-semibold text-lg"
            style="font-family: var(--font-line-seed)"
          >
            {{ levelName }}
          </span>
          <span
            class="text-[#ffcc00] text-lg font-bold"
            style="font-family: var(--font-line-seed)"
          >
            <span class="text-white">{{ formatNumber(levelExp) || "0" }}</span>
            / {{ formatNumber(nextLevelMinExp) || "0" }}
          </span>
        </div>
        <div
          class="h-3.5 w-full rounded-md bg-gray-400 relative overflow-hidden"
        >
          <div
            class="h-full rounded-md transition-all duration-1000 ease-out"
            :style="{
              width: `${progressPercentage}%`,
              backgroundImage:
                'linear-gradient(to right, rgb(255, 225, 0), rgb(153, 135, 0))',
            }"
          />
          <div
            class="absolute inset-0 flex items-center justify-center text-white text-[0.875rem] font-bold"
          >
            {{ Math.round(progressPercentage) }} %
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ Section -->
    <div class="mb-6">
      <h3
        class="text-white text-xl font-bold text-center mb-4"
        style="font-family: var(--font-line-seed)"
      >
        Frequently Asked Questions
      </h3>
      <div class="space-y-2">
        <div
          v-for="item in faqItems"
          :key="item.id"
          class="rounded-lg overflow-hidden"
        >
          <button
            :class="[
              'w-full flex items-center justify-between p-4 transition-colors',
              expandedFaq === item.id ? 'bg-[#285eff]' : 'bg-[#46506d]',
            ]"
            @click="toggleFaq(item.id)"
          >
            <span
              class="text-white text-left flex-1"
              style="font-family: var(--font-line-seed)"
            >
              {{ item.question }}
            </span>
            <svg
              v-if="expandedFaq === item.id"
              class="w-5 h-5 text-white flex-shrink-0 ml-2"
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
              class="w-5 h-5 text-white flex-shrink-0 ml-2"
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
          </button>
          <div
            v-if="expandedFaq === item.id"
            class="bg-gray-300 p-4 tiptap-content"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="text-gray-800" style="font-family: var(--font-line-seed)" v-html="renderTiptap(item.description)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Loyalty Statuses -->
    <div class="mt-8">
      <!-- Progress Check UI -->
      <div
        v-if="memberLevels.length > 0"
        class="mb-14 p-6 rounded-md border border-[#285eff] shadow-2xl"
        style="background: #121212"
      >
        <div class="relative">
          <!-- Progress Bars -->
          <div class="flex mx-3" style="gap: 0.5rem">
            <div
              v-for="(_, barIdx) in Math.min(memberLevels.length - 1, 4)"
              :key="barIdx"
              class="flex-1 h-3 bg-gray-400 rounded-full overflow-hidden shadow-inner"
            >
              <div
                class="h-full rounded-full transition-all duration-1000 ease-out"
                :style="{
                  width: `${getProgressBarWidth(barIdx)}%`,
                  background:
                    'linear-gradient(90deg, #3b82f6, #1d4ed8, #1e40af)',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                  borderRadius: '9999px',
                }"
              />
            </div>
          </div>
          <!-- Progress Circles -->
          <div class="absolute top-0 left-0 right-0 flex -mt-3 mx-3">
            <div
              v-for="(level, index) in memberLevels.slice(0, 5)"
              :key="level.id"
              class="flex flex-col items-center absolute"
              :style="{
                left: getLevelPosition(index, Math.min(memberLevels.length, 5)),
                transform: 'translateX(-50%)',
              }"
            >
              <div
                :class="[
                  'w-8 h-8 rounded-full border-3 flex items-center justify-center transition-all duration-500 ease-out transform hover:scale-110',
                  level.id <= userLevel
                    ? 'border-blue-400 shadow-xl ring-2 ring-blue-500/30'
                    : 'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-500 shadow-lg shadow-gray-800/40',
                ]"
                :style="
                  level.id <= userLevel
                    ? {
                        background:
                          'linear-gradient(135deg, #3b82f6, #1d4ed8, #1e40af)',
                        boxShadow: '0 0 15px rgba(59, 130, 246, 0.6)',
                      }
                    : {}
                "
              >
                <svg
                  v-if="level.id <= userLevel"
                  class="w-5 h-5 text-white drop-shadow-lg"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <svg
                  v-else
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div class="mt-6 text-center">
                <span
                  :class="[
                    'font-bold transition-all duration-300 uppercase text-xs sm:text-sm',
                    level.id <= userLevel
                      ? 'text-white drop-shadow-lg'
                      : 'text-gray-500',
                  ]"
                >
                  {{ level.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Cards -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3"
      >
        <div
          v-for="level in memberLevels.slice(0, 5)"
          :key="level.id"
          :class="[
            'rounded-md border p-4 bg-transparent shadow-[inset_2px_2px_2px_#00000040,0_2px_2px_#0000008c] transition-all duration-200',
            level.id <= userLevel
              ? 'border-[#285eff] hover:-translate-y-[1px] hover:border-[#898989] hover:shadow-[0_.4rem_1.2rem_#00000033]'
              : 'border-[#285eff] opacity-50',
          ]"
          style="background: linear-gradient(180deg, #121212 0, #121212 100%)"
        >
          <div class="flex justify-center mb-3">
            <NuxtImg
              :src="
                (siteConfig.assets.images as unknown as Record<string, string>)[
                  level.name.toLowerCase() === 'diamond'
                    ? 'diamonds'
                    : level.name.toLowerCase()
                ]
              "
              :alt="level.name"
              width="90"
              height="90"
              :class="level.id <= userLevel ? '' : 'grayscale'"/>
          </div>
          <p
            :class="[
              'text-center mb-1 font-bold',
              level.id <= userLevel ? 'text-white/80' : 'text-gray-500',
            ]"
          >
            {{ level.name }}
          </p>
          <p
            :class="[
              'text-center mb-3 text-xs',
              level.id <= userLevel ? 'text-white/60' : 'text-gray-400',
            ]"
          >
            <span class="font-bold">EXP</span>
            {{ getLevelExpRange(level) }}
          </p>
          <div
            :class="[
              'h-8 w-full rounded-md flex items-center justify-center text-xs font-bold relative overflow-hidden',
              level.id <= userLevel
                ? 'bg-black/60 text-white'
                : 'bg-gray-600/40 text-gray-400',
            ]"
          >
            <div
              v-if="level.id <= userLevel"
              class="absolute inset-0 rounded-md transition-all duration-1000 ease-out"
              :style="{
                width:
                  level.id === userLevel ? `${progressPercentage}%` : '100%',
                background: 'linear-gradient(90deg, #3b82f6, #1d4ed8, #1e40af)',
                opacity: 1,
              }"
            />
            <span class="relative z-10">
              {{
                level.id === userLevel
                  ? `${Math.round(progressPercentage)} %`
                  : level.id <= userLevel
                    ? "100%"
                    : "Locked"
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useApi } from "@/composables/useApi";
import { formatNumber } from "~/lib/formatter";
import { renderTiptap } from "~/composables/useTiptap";

const siteConfig = useSiteConfig();

interface MemberLevel {
  id: number;
  name: string;
  min_exp: string;
}

interface FaqItem {
  id: number;
  question: string;
  description: string;
}

/** Raw FAQ-style entry returned by the levelSystem config endpoint. */
interface LevelFaqItem {
  title?: string;
  description?: string;
}

const authStore = useAuthStore();

const memberLevels = ref<MemberLevel[]>([]);
const expandedFaq = ref<number | null>(null);
const faqItems = ref<FaqItem[]>([]);

const userLevel = computed(() => authStore.user.level || 0);
const levelExp = computed(() => authStore.user.level_exp || "0");
const nextLevelMinExp = computed(
  () => authStore.user.next_level_min_exp || "1",
);
const levelName = computed(() => authStore.user.level_name || "Bronze");

const progressPercentage = computed(() => {
  const current = parseFloat(levelExp.value) || 0;
  const target = parseFloat(nextLevelMinExp.value) || 1;
  return Math.min(100, Math.max(0, (current / target) * 100));
});

const imagePath = computed(() => {
  const name = levelName.value?.toLowerCase() || "bronze";
  return (siteConfig.assets.images as unknown as Record<string, string>)[
    name === "diamond" ? "diamonds" : name
  ];
});

function toggleFaq(id: number) {
  expandedFaq.value = expandedFaq.value === id ? null : id;
}

function getProgressBarWidth(barIndex: number): number {
  const current = userLevel.value;
  if (current > barIndex + 1) return 100;
  if (current === barIndex + 1) return progressPercentage.value;
  return 0;
}

function getLevelPosition(index: number, total: number): string {
  if (total <= 1) return "0";
  const pct = (index / (total - 1)) * 100;
  return `${pct}%`;
}

function getLevelExpRange(level: MemberLevel): string {
  const currentMinExp = parseFloat(level.min_exp) || 0;
  const nextLevel = memberLevels.value.find((l) => l.id === level.id + 1);
  if (nextLevel) {
    const nextMinExp = parseFloat(nextLevel.min_exp) || 0;
    const rangeStart = level.id === 1 ? currentMinExp : currentMinExp + 1;
    return `${formatNumber(rangeStart)}-${formatNumber(nextMinExp)}`;
  }
  const rangeStart = level.id === 1 ? currentMinExp : currentMinExp + 1;
  return `${formatNumber(rangeStart)}+`;
}

onMounted(async () => {
  try {
    const api = useApi();
    const [levels, config] = await Promise.all([
      api<MemberLevel[]>("/promotions/level-rewards"),
      api<{ data?: LevelFaqItem[] } | LevelFaqItem[]>(
        "/site/config/userpage/levelSystem",
      ),
    ]);
    memberLevels.value = levels || [];

    // Parse levelSystem config — each item key is a FAQ entry with question + description
    const configData: LevelFaqItem[] = Array.isArray(config)
      ? config
      : (config?.data ?? []);
    faqItems.value = configData
      .filter((item): item is Required<LevelFaqItem> => !!item && !!item.title)
      .reverse()
      .map((item, idx) => ({
        id: idx + 1,
        question: item.title,
        description: item.description,
      }));
  } catch (err) {
    console.error("Failed to fetch level system data:", err);
    memberLevels.value = [];
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
