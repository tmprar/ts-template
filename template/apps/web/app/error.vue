<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * エラーページ。どの画面にも入れないときの行き止まり
 */
const props = defineProps<{ error: NuxtError }>()

// 404だけは行き先の間違いとして伝える。それ以外はまとめて一時的な不具合として扱う
const isNotFound = computed(() => props.error.status === 404)

useHead({ title: () => (isNotFound.value ? 'ページが見つかりません' : 'エラー') })
</script>

<template>
  <UApp>
    <UContainer class="max-w-2xl py-10">
      <div class="flex flex-col gap-4">
        <h1 class="text-2xl font-semibold">
          {{ isNotFound ? 'ページが見つかりません' : '問題が発生しました' }}
        </h1>

        <p class="text-pretty text-toned">
          {{
            isNotFound
              ? 'URLが変わったか、削除された可能性があります。アドレスをご確認ください。'
              : '一時的な不具合の可能性があります。時間をおいて再度お試しください。'
          }}
        </p>

        <div>
          <UButton @click="clearError({ redirect: '/' })">
            トップへ戻る
          </UButton>
        </div>
      </div>
    </UContainer>
  </UApp>
</template>
