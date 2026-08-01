<template>
  <div
    class="tm-card font-medium rounded-xl overflow-hidden mb-4 md:mb-6 shadow-lg"
  >
    <!-- Form Header -->
    <div class="tm-thead flex items-center gap-3 px-4 md:px-6 py-3.5 md:py-4">
      <!-- Icon tile derives from the band's own white, so it themes with the
           accent behind it instead of introducing a second colour. -->
      <span
        class="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 md:w-[18px] md:h-[18px]"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M0 15.8339V20H4.16609L16.4533 7.71282L12.2872 3.54673L0 15.8339ZM19.675 4.49104C20.1083 4.05777 20.1083 3.35787 19.675 2.92459L17.0754 0.324955C16.6421 -0.108318 15.9422 -0.108318 15.509 0.324955L13.4759 2.35801L17.642 6.52409L19.675 4.49104Z"
          />
        </svg>
      </span>
      <div class="min-w-0">
        <h2 class="text-white text-base md:text-lg font-semibold leading-tight">
          {{ t("inquiry.writeInquiry") }}
        </h2>
        <p class="hidden sm:block truncate text-xs text-white/60 mt-0.5">
          {{ t("inquiry.sendUsYourQuestions") }}
        </p>
      </div>
    </div>

    <!-- Form Content -->
    <div class="p-4 md:p-6">
      <form class="space-y-5" @submit.prevent="onSubmit">
        <!-- Title Field -->
        <div class="space-y-2">
          <div class="flex items-baseline justify-between gap-3">
            <label
              for="inquiry-title"
              class="block text-white text-sm font-semibold"
            >
              {{ t("inquiry.subject") }} <span class="text-[#DC2626]">*</span>
            </label>
            <span
              class="text-[11px] tabular-nums transition-colors duration-200"
              :class="counterClass(titleLength, TITLE_MAX)"
            >
              {{ titleLength }}/{{ TITLE_MAX }}
            </span>
          </div>
          <div class="relative">
            <span
              class="tm-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </span>
            <input
              id="inquiry-title"
              v-model="titleField"
              type="text"
              :maxlength="TITLE_MAX"
              :placeholder="t('inquiry.enterInquiryTitle')"
              :aria-invalid="Boolean(errors.title)"
              :aria-describedby="errors.title ? 'inquiry-title-error' : undefined"
              :class="[
                'tm-field w-full pl-10 pr-4 py-2.5 md:py-3 text-sm transition-all duration-200 outline-none',
                errors.title ? '!border-[#DC2626] ring-2 ring-[#DC2626]/20' : '',
              ]"
            >
          </div>
          <p
            v-if="errors.title"
            id="inquiry-title-error"
            role="alert"
            class="text-xs text-[#DC2626] mt-1 flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-3.5 h-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            {{ errors.title }}
          </p>
        </div>

        <!-- Body Field -->
        <div class="space-y-2">
          <div class="flex items-baseline justify-between gap-3">
            <label
              for="inquiry-body"
              class="block text-white text-sm font-semibold"
            >
              {{ t("inquiry.body") }} <span class="text-[#DC2626]">*</span>
            </label>
            <span
              class="text-[11px] tabular-nums transition-colors duration-200"
              :class="counterClass(contentLength, BODY_MAX)"
            >
              {{ contentLength }}/{{ BODY_MAX }}
            </span>
          </div>
          <textarea
            id="inquiry-body"
            v-model="contentField"
            :placeholder="t('inquiry.enterInquiryBody')"
            :maxlength="BODY_MAX"
            rows="8"
            :aria-invalid="Boolean(errors.content)"
            :aria-describedby="errors.content ? 'inquiry-body-error' : undefined"
            :class="[
              'tm-field w-full min-h-[160px] md:min-h-[200px] px-4 py-3 text-sm leading-relaxed transition-all duration-200 outline-none resize-none',
              errors.content ? '!border-[#DC2626] ring-2 ring-[#DC2626]/20' : '',
            ]"
          />
          <p
            v-if="errors.content"
            id="inquiry-body-error"
            role="alert"
            class="text-xs text-[#DC2626] mt-1 flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-3.5 h-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            {{ errors.content }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div
          class="tm-line flex flex-col-reverse gap-3 pt-4 border-t sm:flex-row sm:items-center"
        >
          <p class="tm-muted text-xs leading-snug sm:flex-1">
            {{ t("inquiry.inquiryNote") }}
          </p>
          <div class="flex gap-3 sm:shrink-0">
            <button
              type="button"
              :disabled="isSubmitting"
              class="tm-btn-ghost inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 md:px-5 md:py-3 rounded-lg transition-all duration-200 font-medium text-sm md:text-base cursor-pointer sm:flex-none"
              @click="$emit('cancel')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 md:w-5 md:h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>{{ t("common.cancel") }}</span>
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="tm-btn inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 rounded-lg transition-all duration-200 font-semibold text-sm md:text-base cursor-pointer shadow-md hover:shadow-lg sm:flex-none sm:min-w-[140px]"
            >
              <template v-if="isSubmitting">
                <svg
                  class="w-4 h-4 md:w-5 md:h-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>{{ t("inquiry.submitting") }}</span>
              </template>
              <template v-else>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                <span>{{ t("inquiry.submit") }}</span>
              </template>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm } from "vee-validate";
import { inquirySchema } from "@/schemas";

interface Props {
  isSubmitting?: boolean;
}

interface Emits {
  (e: "submit", values: { title: string; content: string }): void;
  (e: "cancel"): void;
}

withDefaults(defineProps<Props>(), {
  isSubmitting: false,
});

const emit = defineEmits<Emits>();

const { t, locale } = useI18n();

/** Field limits — bound to both the `maxlength` attributes and the counters. */
const TITLE_MAX = 100;
const BODY_MAX = 2000;

// VeeValidate form — reactive schema so the (baked) validation messages follow
// the active locale instead of freezing to the first language.
const { handleSubmit, errors, defineField } = useForm({
  validationSchema: computed(() => {
    void locale.value;
    return inquirySchema(t);
  }),
});

const [titleField] = defineField("title");
const [contentField] = defineField("content");

const titleLength = computed(() => (titleField.value ?? "").length);
const contentLength = computed(() => (contentField.value ?? "").length);

/**
 * Colour class for a character counter.
 *
 * The counter is muted until the field is nearly full, then switches to the
 * accent so the limit is felt before `maxlength` silently swallows keystrokes.
 * @param {number} length - Current character count.
 * @param {number} max - The field's maximum length.
 * @returns {string} `tm-accent-text` past 90% of the limit, else `tm-muted`.
 */
function counterClass(length: number, max: number): string {
  return length >= max * 0.9 ? "tm-accent-text" : "tm-muted";
}

const onSubmit = handleSubmit((values) => {
  emit("submit", {
    title: values.title.trim(),
    content: values.content.trim(),
  });
});
</script>
