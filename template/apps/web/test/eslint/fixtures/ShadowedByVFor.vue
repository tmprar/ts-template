<script setup lang="ts">
/** v-forのローカル変数がpropと同じ名前。propの参照ではないので対象外 */
const props = defineProps<{
  item: string
  items: string[]
}>()
</script>

<template>
  <span
    v-for="item in props.items"
    :key="item"
  >{{ item }}</span>
</template>
