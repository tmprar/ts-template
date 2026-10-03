<script setup lang="ts">
/** インラインの型リテラル */
const props = defineProps<{
  label: string
}>()
</script>

<template>
  <span>{{ label }}</span>
  <span>{{ props.label }}</span>
</template>
