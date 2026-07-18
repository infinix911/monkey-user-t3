<template>
  <div>
    <label
      v-if="label"
      class="text-[#1F1F1F] text-[16px] mb-1 block"
      style="font-family: var(--font-line-seed)"
    >
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <Field
        v-slot="{ field, errors: fieldErrors }"
        :name="name"
        :rules="rules"
      >
        <input
          v-bind="field"
          :type="type"
          :placeholder="placeholder"
          class="w-full px-4 py-[12px] bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          :class="{
            'border-2 border-red-500': fieldErrors.length > 0 || error,
            'pr-12': $slots.suffix,
          }"
          style="
            font-family: var(--font-line-seed);
            box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
          "
        >
        <slot name="suffix" />
        <span
          v-if="fieldErrors.length > 0"
          class="text-red-500 text-xs mt-1 block"
        >
          {{ fieldErrors[0] }}
        </span>
        <span v-else-if="error" class="text-red-500 text-xs mt-1 block">{{
          error
        }}</span>
      </Field>
    </div>
    <slot name="hint" />
  </div>
</template>

<script setup lang="ts">
import { Field } from "vee-validate";

interface FormFieldProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  rules?: string | Record<string, unknown>;
}

withDefaults(defineProps<FormFieldProps>(), {
  label: undefined,
  type: "text",
  placeholder: "",
  error: undefined,
  required: false,
  rules: undefined,
});
</script>
