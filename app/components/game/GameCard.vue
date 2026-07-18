<template>
  <div class="group cursor-pointer relative z-10">
    <div
      class="relative rounded-[13px] overflow-hidden transition-all duration-300 w-full"
      :style="{
        backgroundColor: siteConfig.theme.brandColor,
        transition: 'all 0.3s ease',
      }"
    >
      <div class="relative w-full aspect-square">
        <img
          v-if="game.game_img && !imgError"
          :src="game.game_img"
          :alt="game.game_name_en"
          :loading="eager ? 'eager' : 'lazy'"
          :fetchpriority="priority ? 'high' : undefined"
          width="240"
          height="240"
          class="opacity-90 w-full h-full object-contain object-center transition-all duration-300 group-hover:scale-110 group-hover:opacity-80"
          @error="imgError = true"
        >

        <!-- Icon centered on thumbnail -->
        <div
          v-if="!game.game_img || imgError"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-10 h-10 sm:w-12 sm:h-12 text-white/70"
          >
            <line x1="6" y1="11" x2="10" y2="11" />
            <line x1="8" y1="9" x2="8" y2="13" />
            <circle cx="15" cy="10" r="0.5" fill="currentColor" />
            <circle cx="17" cy="12" r="0.5" fill="currentColor" />
            <path
              d="M2 15.5V8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v7.5a2.5 2.5 0 0 1-2.5 2.5h-2.06a2 2 0 0 1-1.66-.88L14.2 14.5H9.8l-1.58 2.62A2 2 0 0 1 6.56 18H4.5A2.5 2.5 0 0 1 2 15.5Z"
            />
          </svg>
        </div>

        <!-- Hover overlay -->
        <div
          class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
          style="background: rgba(0, 0, 0, 0.6)"
        >
          <div
            class="absolute inset-0 flex flex-col items-center justify-center text-center px-5"
          >
            <div
              class="bg-[#D3D3D3] hover:bg-[#BEBEBE] text-black text-sm font-bold py-2 px-5 rounded-md shadow-xl transition-all duration-200 transform hover:scale-105 cursor-pointer"
            >
              {{ $t("common.play") }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Game info -->
    <div class="mt-2">
      <p
        class="italic text-white text-[12px] sm:text-[14.252px] font-bold leading-[18px] sm:leading-[21.217px] tracking-[-0.36px] sm:tracking-[-0.4276px] text-center transition-colors duration-200 group-hover:text-[#D4AF37] truncate px-1"
        :title="game.game_name_en"
      >
        {{ game.game_name_en }}
      </p>
      <div
        v-if="showProvider"
        class="min-h-[18px] sm:min-h-[21px] flex items-center justify-center"
      >
        <p
          class="italic text-[#b0b0b0] text-[12px] sm:text-[14.252px] font-medium leading-[18px] sm:leading-[21.217px] tracking-[-0.36px] sm:tracking-[-0.4276px] text-center mt-1 line-clamp-1 break-words"
        >
          {{ game.lobby }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Game {
  id: string | number;
  game_name_en: string;
  game_img?: string;
  lobby?: string;
}

const siteConfig = useSiteConfig();
const imgError = ref(false);

withDefaults(
  defineProps<{
    game: Game;
    showProvider?: boolean;
    eager?: boolean;
    priority?: boolean;
  }>(),
  {
    showProvider: true,
    eager: false,
    priority: false,
  },
);
</script>
