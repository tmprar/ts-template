<script setup lang="ts">
/** 型参照。型情報がないと prop 名を解決できない */
type Props = {
  title: string
}

const props = defineProps<Props>()
</script>

<template>
  <span>{{ title }}</span>
  <span>{{ props.title }}</span>
</template>
