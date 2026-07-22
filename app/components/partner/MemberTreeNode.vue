<template>
  <div class="select-none">
    <!-- Node row -->
    <div
      class="flex items-center gap-2 py-1.5 pr-2 rounded-lg transition-colors"
      :class="hasChildren ? 'cursor-pointer hover:bg-white/[0.05]' : ''"
      @click="toggle"
    >
      <!-- Expand / collapse chevron (leaf gets a spacer) -->
      <button
        v-if="hasChildren"
        type="button"
        class="w-4 h-4 flex items-center justify-center shrink-0"
        :style="{ color: accent }"
        :aria-label="expanded ? $t('partnerPages.tree.closeAll') : $t('partnerPages.tree.openAll')"
      >
        <svg class="w-3 h-3 transition-transform duration-200" :class="expanded ? 'rotate-90' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <span v-else class="w-4 shrink-0" />

      <!-- Folder / member icon -->
      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"
        :style="{ color: accent }">
        <path stroke-linecap="round" stroke-linejoin="round"
          :d="hasChildren
            ? 'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-.94-.94a2.25 2.25 0 0 0-1.59-.66H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z'
            : 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z'" />
      </svg>

      <!-- Level badge -->
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
        :style="{ color: accent, background: 'rgba(255,255,255,0.06)' }">
        {{ levelLabel }}
      </span>

      <!-- Username / nickname / lower-member count -->
      <span class="text-white text-[13px] font-semibold whitespace-nowrap">{{ node.label }}</span>
      <span v-if="node.userlabel" class="text-white/45 text-xs whitespace-nowrap">({{ node.userlabel }})</span>
      <span class="text-white/35 text-[11px] whitespace-nowrap">· {{ node.memberCount }}</span>

      <!-- Status badge -->
      <span v-if="node.status !== undefined" class="ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
        :class="statusClass">
        {{ statusLabel }}
      </span>
    </div>

    <!-- Children (recursive) -->
    <div v-if="hasChildren && expanded" class="ml-4 pl-3 border-l border-white/10">
      <MemberTreeNode v-for="child in node.nodes" :key="child.id" :node="child" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { MemberTreeItem } from "@/utils/partnerMenu";

const props = defineProps<{ node: MemberTreeItem }>();

const { t } = useI18n();
const { accent } = usePartnerTheme();

const hasChildren = computed(() => (props.node.nodes?.length ?? 0) > 0);
const expanded = ref(Boolean(props.node.expanded));
watch(() => props.node.expanded, (value) => { expanded.value = Boolean(value); });

/** Toggle local presentation state without mutating a readonly prop. */
const toggle = () => {
  if (hasChildren.value) expanded.value = !expanded.value;
};

/** Depth → level label (본사/부본사/… mirrored as generic L1..Ln). */
const levelLabel = computed(() => `L${props.node.depth}`);

const statusLabel = computed(() => {
  switch (props.node.status) {
    case 0: return t("partnerPages.status.new");
    case 1: return t("partnerPages.status.waiting");
    case 2: return t("partnerPages.status.normal");
    default: return t("partnerPages.status.stopped");
  }
});

const statusClass = computed(() => {
  switch (props.node.status) {
    case 0: return "bg-blue-900/40 text-blue-300";
    case 1: return "bg-yellow-900/40 text-yellow-300";
    case 2: return "bg-green-900/40 text-green-400";
    default: return "bg-red-900/40 text-red-400";
  }
});
</script>
