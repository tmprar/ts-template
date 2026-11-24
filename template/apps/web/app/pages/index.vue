<script setup lang="ts">
import {
  type CreateTodoInput,
  createTodoSchema,
} from '@myapp/contracts'

import {
  countTodosByStatus,
  TodoList,
  TodoListItem,
  useTodos,
} from '~/features/todo'

/**
 * todoの一覧(構成を示すためのサンプル画面)。
 * 画面の中身はルートのファイルに書き、取得と更新は機能のcomposableに任せる
 */
useHead({ title: 'todo' })

const { addTodo, completeTodo, isAdding, isPending, removeTodo, todos } = useTodos()

/**
 * 追加フォームの入力。検証はcontractsのスキーマ(APIの入口と同じもの)で行う
 */
const form = reactive({ title: '' })

const todoCount = computed(() => countTodosByStatus(todos.value ?? []))

/**
 * 検証を通った入力(前後の空白を除いた件名)でtodoを追加し、追加できたら入力欄を空にする。
 * 失敗の案内はcomposableがトーストで出すので、画面は成功したときの後処理だけを書く
 */
const submit = (input: CreateTodoInput) => {
  addTodo({ body: { title: input.title } }, {
    onSuccess: () => {
      form.title = ''
    },
  })
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
        v-if="isPending"
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
          @complete="completeTodo({ path: { id: $event } })"
          @remove="removeTodo({ path: { id: $event } })"
        />
      </TodoList>
    </div>
  </UContainer>
</template>
