<template>
  <div>
    <label
      v-if="label"
      class="mb-1 block text-[13px] font-bold leading-tight text-white"
      style="font-family: var(--font-line-seed)"
    >
      {{ label }} <span v-if="required" class="text-[#FF5A3C]">*</span>
    </label>
    <div class="relative">
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :maxlength="maxlength"
        class="h-[42px] w-full rounded-[8px] border px-3 text-[16px] md:text-[14px] transition-colors focus:outline-none"
        :style="{
          backgroundColor: 'var(--tm-input-bg)',
          color: 'var(--tm-input-text)',
          borderColor: error ? '#FF5A3C' : 'var(--tm-input-border)',
          fontFamily: 'var(--font-line-seed)',
          paddingRight: $slots.suffix ? '48px' : undefined,
        }"
        @input="
          $emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
        @blur="$emit('blur')"
      >
      <slot name="suffix" />
    </div>
    <span v-if="error" class="mt-1 block text-xs text-[#FF5A3C]">{{
      error
    }}</span>
    <slot name="hint" />
  </div>
</template>

<script setup lang="ts">
interface FormFieldProps {
  modelValue: string | undefined;
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  maxlength?: string | number;
}

withDefaults(defineProps<FormFieldProps>(), {
  label: undefined,
  type: "text",
  placeholder: "",
  error: undefined,
  required: false,
  maxlength: undefined,
});

defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();
</script>
