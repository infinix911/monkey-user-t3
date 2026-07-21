<template>
  <div class="member-tree rounded-2xl overflow-hidden" :style="{ background: cardBg }">
    <!-- Header: title + open/close all -->
    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
      <span class="w-1 h-4 rounded-full" :style="{ background: accent, boxShadow: `0 0 8px ${accent}` }" />
      <h3 class="text-white text-[13px] font-bold uppercase tracking-wide mr-auto">
        {{ $t('partnerPages.tree.title') }}
      </h3>
      <button type="button" class="tree-btn" :style="{ color: accent, borderColor: 'rgba(255,255,255,0.12)' }"
        @click="setAll(true)">
        {{ $t('partnerPages.tree.openAll') }}
      </button>
      <button type="button" class="tree-btn" :style="{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.12)' }"
        @click="setAll(false)">
        {{ $t('partnerPages.tree.closeAll') }}
      </button>
    </div>

    <!-- Tree -->
    <div class="p-2 max-h-[560px] overflow-y-auto scrollbar-none">
      <MemberTreeNode v-for="node in treeData" :key="node.id" :node="node" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { MemberTreeItem } from "@/utils/partnerMenu";
import { useApi } from "@/composables/useApi";

const { accent, cardBg } = usePartnerTheme();

type PartnerTreeNode = {
  memberId: string;
  username: string;
  name: string;
  depth: number | null;
  status: number | null;
  childCount: number;
  nodes?: PartnerTreeNode[];
};

const treeData = ref<MemberTreeItem[]>([]);

const mapNode = (node: PartnerTreeNode): MemberTreeItem => ({
  id: node.memberId,
  label: node.username,
  userlabel: node.name,
  depth: node.depth ?? 0,
  memberCount: node.childCount,
  status: node.status ?? undefined,
  expanded: true,
  nodes: node.nodes?.map(mapNode),
});

const loadTree = async () => {
  try {
    const api = useApi();
    const response = await api<PartnerTreeNode[]>("/partners/members/tree");
    treeData.value = response.map(mapNode);
  } catch {
    treeData.value = [];
  }
};

/** Expand or collapse every node in the tree. */
function setAll(open: boolean): void {
  const walk = (nodes: MemberTreeItem[]) => {
    for (const n of nodes) {
      if (n.nodes?.length) {
        n.expanded = open;
        walk(n.nodes);
      }
    }
  };
  walk(treeData.value);
}

// Fully expanded on first render (mirrors stargazer-high's default tree state).
onMounted(loadTree);
</script>

<style scoped>
.member-tree {
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px) saturate(1.05);
  -webkit-backdrop-filter: blur(12px) saturate(1.05);
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.35),
    0 20px 48px -26px rgba(0, 0, 0, 0.85);
}

.tree-btn {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid;
  transition: background-color 0.15s ease;
  cursor: pointer;
}

.tree-btn:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.scrollbar-none {
  scrollbar-width: none;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
