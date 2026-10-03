<script setup lang="ts">
import {
  type CreateTodoInput,
  createTodoSchema,
} from '@myapp/contracts'

import { countTodosByStatus } from '~/domain/todo'

/**
 * todoの一覧(構成を示すためのサンプル画面)。
 * ここはImperative Shellとして、入力の状態とcomposable・Coreの呼び出しだけを持つ
 */
useHead({ title: 'todo' })

const { addTodo, completeTodo, removeTodo, status, todos } = useTodos()
const toast = useToast()

/**
追加フォームの入力。検証はcontractsのスキーマ(APIの入口と同じもの)で行う
*/
const form = reactive({ title: '' })

/**
追加の通信中。ボタンの多重押下を止める
*/
const isAdding = ref(false)

const todoCount = computed(() => countTodosByStatus(todos.value ?? []))

/**
 * 検証を通った入力(前後の空白を除いた件名)でtodoを追加する
 */
const submit = async (input: CreateTodoInput) => {
  isAdding.value = true

  /*
    想定できる失敗はResultで返るが、想定外の例外でも通信中の表示を残さないよう
    finallyで戻す(戻し忘れるとボタンが押せないままになる)
  */
  try {
    const result = await addTodo(input.title)

    if (result.isErr()) {
      toast.add({
        color: 'error',
        description: '通信状況をご確認のうえ、もう一度お試しください。',
        title: 'todoを追加できませんでした',
      })

      return
    }

    form.title = ''
  } finally {
    isAdding.value = false
  }
}

const complete = async (id: string) => {
  const result = await completeTodo(id)

  if (result.isErr()) {
    toast.add({
      color: 'error',
      description: '通信状況をご確認のうえ、もう一度お試しください。',
      title: 'todoを完了にできませんでした',
    })
  }
}

const remove = async (id: string) => {
  const result = await removeTodo(id)

  if (result.isErr()) {
    toast.add({
      color: 'error',
      description: '通信状況をご確認のうえ、もう一度お試しください。',
      title: 'todoを削除できませんでした',
    })
  }
}
</script>

<template>
  <UContainer class="max-w-2xl py-10">
    <div class="flex flex-col gap-6">
      <div class="flex items-baseline justify-between gap-4">
        <h1 class="text-2xl font-semibold">
          todo
        </h1>
        <p class="text-sm text-muted">
          未完了 {{ todoCount.open }} 件 / 完了 {{ todoCount.done }} 件
        </p>
      </div>

      <UForm
        class="flex items-start gap-2"
        :schema="createTodoSchema"
        :state="form"
        @submit="submit($event.data)"
      >
        <UFormField
          class="flex-1"
          name="title"
        >
          <UInput
            v-model="form.title"
            aria-label="件名"
            class="w-full"
            placeholder="やることを入力"
          />
        </UFormField>
        <UButton
          :loading="isAdding"
          type="submit"
        >
          追加
        </UButton>
      </UForm>

      <p
        v-if="status === 'pending' || status === 'idle'"
        aria-busy="true"
        class="text-sm text-muted"
      >
        読み込んでいます…
      </p>

      <UAlert
        v-else-if="todos === undefined"
        color="error"
        description="通信状況をご確認のうえ、画面を再読み込みしてください。"
        title="todoを読み込めませんでした"
        variant="subtle"
      />

      <p
        v-else-if="todos.length === 0"
        class="text-sm text-muted"
      >
        まだtodoがありません。上の欄から追加できます。
      </p>

      <TodoList v-else>
        <TodoListItem
          v-for="todo in todos"
          :key="todo.id"
          :item="todo"
          @complete="complete($event)"
          @remove="remove($event)"
        />
      </TodoList>
    </div>
  </UContainer>
</template>
