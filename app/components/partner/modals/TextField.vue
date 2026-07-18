<template>
  <div>
    <label class="pm-label">{{ label }}</label>
    <input :type="type || 'text'" class="pm-input" :value="modelValue" autocomplete="off"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)">
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string | number; label: string; type?: string }>();
defineEmits<{ "update:modelValue": [string] }>();
</script>
