<template>
  <div
    class="font-medium rounded-lg overflow-hidden mb-4 md:mb-6 shadow-sm border border-[#e5e5e5]"
  >
    <!-- Form Header -->
    <div class="bg-[#2563EB] px-4 md:px-6 py-3 md:py-4">
      <h2 class="text-white text-base md:text-lg font-semibold">
        {{ t("inquiry.writeInquiry") }}
      </h2>
    </div>

    <!-- Form Content -->
    <div class="bg-[#D6D6D6] p-4 md:p-6 space-y-5">
      <form class="space-y-5" @submit.prevent="onSubmit">
        <!-- Title Field -->
        <div class="space-y-2">
          <label
            for="inquiry-title"
            class="block text-[#1A1A1A] text-sm font-semibold"
          >
            {{ t("inquiry.title") }} <span class="text-[#DC2626]">*</span>
          </label>
          <input
            id="inquiry-title"
            v-model="titleField"
            type="text"
            maxlength="100"
            :placeholder="t('inquiry.enterInquiryTitle')"
            :class="[
              'w-full bg-[#B0B0B0] text-[#1A1A1A] px-4 py-2.5 md:py-3 rounded-lg placeholder-[#666666] text-sm border transition-all duration-200 outline-none',
              errors.title
                ? 'border-2 border-[#DC2626] ring-2 ring-[#DC2626]/20'
                : 'border-0 focus:ring-2 ring-[#2563EB]/20',
            ]"
          >
          <p
            v-if="errors.title"
            class="text-xs text-[#DC2626] mt-1 flex items-center gap-1"
          >
            <span>&#9888;</span>
            {{ errors.title }}
          </p>
        </div>

        <!-- Body Field -->
        <div class="space-y-2">
          <label
            for="inquiry-body"
            class="block text-[#1A1A1A] text-sm font-semibold"
          >
            {{ t("inquiry.body") }} <span class="text-[#DC2626]">*</span>
          </label>
          <textarea
            id="inquiry-body"
            v-model="contentField"
            :placeholder="t('inquiry.enterInquiryBody')"
            maxlength="2000"
            rows="8"
            :class="[
              'w-full bg-[#B0B0B0] text-[#1A1A1A] px-4 py-3 rounded-lg placeholder-[#666666] text-sm border transition-all duration-200 outline-none resize-none',
              errors.content
                ? 'border-2 border-[#DC2626] ring-2 ring-[#DC2626]/20'
                : 'border-0 focus:ring-2 ring-[#2563EB]/20',
            ]"
          />
          <p
            v-if="errors.content"
            class="text-xs text-[#DC2626] mt-1 flex items-center gap-1"
          >
            <span>&#9888;</span>
            {{ errors.content }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 justify-end pt-4 border-t border-[#B0B0B0]/30">
          <button
            type="button"
            :disabled="isSubmitting"
            class="inline-flex items-center gap-2 bg-[#9E9E9E] text-white px-4 py-2.5 md:px-5 md:py-3 rounded-lg hover:opacity-90 active:opacity-80 transition-all duration-200 font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            class="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 md:px-5 md:py-3 rounded-lg hover:opacity-90 active:opacity-80 transition-all duration-200 font-medium text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50 cursor-pointer shadow-sm"
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

const onSubmit = handleSubmit((values) => {
  emit("submit", {
    title: values.title.trim(),
    content: values.content.trim(),
  });
});
</script>
