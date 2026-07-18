<template>
  <button
    :class="[
      'inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(212,175,55,0.1)] hover:bg-[rgba(212,175,55,0.2)] border border-[#C9A500]/50 transition-colors duration-200 cursor-pointer',
      extraClass,
    ]"
    :title="
      isFullscreen ? t('common.exitFullscreen') : t('common.enterFullscreen')
    "
    @click="$emit('toggle')"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      class="text-white"
    >
      <path
        v-if="isFullscreen"
        d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-else
        d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    isFullscreen: boolean;
    extraClass?: string;
  }>(),
  {
    extraClass: "",
  },
);

const emit = defineEmits<{
  toggle: [];
}>();

const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);

  // Auto-trigger fullscreen on mobile
  if (isMobile.value && !props.isFullscreen) {
    emit("toggle");
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
</script>
