<template>
  <Teleport to="body">
    <Transition name="app-dialog">
      <div
        v-if="isOpen"
        class="tm-modal fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/60"
        :style="modalTheme"
        @click.self="cancel"
      >
        <section
          class="modal-body-fill modal-gradient-border w-full max-w-[34rem] rounded-[18px] p-6 text-center shadow-2xl sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evolution-consent-title"
          @keydown.enter.prevent="handleEnter"
        >
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full tm-accent-bar">
            <svg class="h-7 w-7 tm-accent-text" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m5 12 4.2 4.2L19 6.8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>

          <h2 id="evolution-consent-title" class="font-line-seed tm-accent-text text-[1.3rem] font-bold leading-snug">
            {{ t("game.evolutionOneToTenConsent.title") }}
          </h2>

          <template v-if="stage === 'notice'">
            <p class="font-line-seed tm-muted mt-3 whitespace-pre-line text-[0.95rem] leading-7">
              {{ t("game.evolutionOneToTenConsent.notice") }}
            </p>
            <div class="tm-card mt-5 rounded-2xl p-4 text-left sm:p-5">
              <p class="font-line-seed tm-muted whitespace-pre-line text-[0.9rem] leading-7">
                {{ t("game.evolutionOneToTenConsent.explanation") }}
              </p>
              <p class="font-line-seed tm-muted mt-4 whitespace-pre-line text-[0.9rem] leading-7">
                {{ t("game.evolutionOneToTenConsent.examples") }}
              </p>
            </div>
          </template>

          <template v-else>
            <p class="font-line-seed tm-muted mt-3 whitespace-pre-line text-[0.95rem] leading-7">
              {{ t("game.evolutionOneToTenConsent.confirmationDescription", { word: confirmationWord }) }}
            </p>
            <label class="sr-only" for="evolution-consent-input">
              {{ t("game.evolutionOneToTenConsent.inputLabel") }}
            </label>
            <input
              id="evolution-consent-input"
              ref="confirmationInput"
              v-model="typedConfirmation"
              type="text"
              autocomplete="off"
              class="tm-field font-line-seed mt-6 h-14 w-full rounded-full px-6 text-center text-lg font-semibold"
              :placeholder="t('game.evolutionOneToTenConsent.inputPlaceholder', { word: confirmationWord })"
            >
          </template>

          <div class="mt-6 flex items-center justify-center gap-3">
            <button type="button" class="tm-btn-ghost font-line-seed min-w-32 rounded-xl px-7 py-3 text-[0.95rem] font-semibold transition-opacity hover:opacity-90" @click="cancel">
              {{ t("common.cancel") }}
            </button>
            <button
              type="button"
              class="tm-btn font-line-seed min-w-32 rounded-xl px-7 py-3 text-[0.95rem] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="stage === 'confirmation' && !isConfirmationValid"
              @click="agree"
            >
              {{ t("game.evolutionOneToTenConsent.agree") }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useEvolutionOneToTenConsent } from "@/composables/useEvolutionOneToTenConsent";

const { t } = useI18n();
const modalTheme = useModalTheme();
const {
  isOpen,
  stage,
  typedConfirmation,
  continueToConfirmation,
  cancel,
  confirm,
} = useEvolutionOneToTenConsent();

const confirmationInput = ref<HTMLInputElement | null>(null);
const confirmationWord = computed(() =>
  String(t("game.evolutionOneToTenConsent.confirmationWord")),
);
const isConfirmationValid = computed(
  () => typedConfirmation.value === confirmationWord.value,
);

watch(stage, async (nextStage) => {
  if (nextStage !== "confirmation") return;
  await nextTick();
  confirmationInput.value?.focus();
});

const agree = (): void => {
  if (stage.value === "notice") {
    continueToConfirmation();
    return;
  }
  if (isConfirmationValid.value) confirm();
};

const handleEnter = (): void => {
  if (stage.value === "notice" || isConfirmationValid.value) agree();
};
</script>
