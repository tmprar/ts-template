<script setup lang="ts">
import type { TodoItem } from '~/domain/todo'

/**
 * todoの1行。描画に徹し、操作は親へ伝えるだけにする
 */
const props = defineProps<{ item: TodoItem }>()

const emit = defineEmits<{
  complete: [id: string]
  remove: [id: string]
}>()
</script>

<template>
  <li class="flex items-center gap-3 px-4 py-3">
    <span
      class="flex-1 text-sm"
      :class="props.item.status === 'completed' ? 'text-muted line-through' : 'text-default'"
    >
      {{ props.item.title }}
    </span>

    <UBadge
      v-if="props.item.status === 'completed'"
      color="neutral"
      variant="subtle"
    >
      完了
    </UBadge>
    <UButton
      v-else
      size="sm"
      variant="soft"
      @click="emit('complete', props.item.id)"
    >
      完了にする
    </UButton>

    <UButton
      :aria-label="`「${props.item.title}」を削除`"
      color="neutral"
      icon="i-lucide-trash-2"
      size="sm"
      variant="ghost"
      @click="emit('remove', props.item.id)"
    />
  </li>
</template>
