import type { Todo } from '@myapp/contracts'

import {
  err,
  ok,
  type Result,
} from 'neverthrow'

import {
  todoControllerComplete,
  todoControllerCreate,
  todoControllerFindMany,
  todoControllerRemove,
} from '~/generated/api/sdk.gen'

/**
 * todoの一覧と操作。
 * ここはImperative Shellとして、APIの呼び出しと取得した状態だけを持つ
 */
export const useTodos = () => {
  const { data: todos, refresh, status } = useAsyncData(
    'todos',
    /*
      戻り値の型を明示して、生成型がcontractsの形と一致することを
      コンパイル時に検査する
    */
    async (): Promise<Todo[]> => {
      const { data } = await todoControllerFindMany()

      if (data === undefined) {
        throw new Error('todoを取得できませんでした')
      }

      return data.todos
    },
  )

  /**
   * 操作を送り、通ったら一覧を取り直してAPIの応答を返す。
   * 失敗の理由は画面で出し分けないため種類は1つにまとめ、捕まえた例外は `cause` に載せて返す。
   *
   * 呼び出しには `throwOnError: true` を付ける。付けないと応答が
   * 「dataかerrorのどちらか」になり、成功の側のdataの型を取り出せない
   */
  const send = async <T>(
    request: () => Promise<{ data: T }>,
  ): Promise<Result<T, {
    cause: unknown
    type: 'failed'
  }>> => {
    try {
      const { data } = await request()

      await refresh()

      return ok(data)
    } catch (error) {
      return err({
        cause: error,
        type: 'failed',
      })
    }
  }

  const addTodo = async (title: string) =>
    await send(async () => await todoControllerCreate({
      body: { title },
      throwOnError: true,
    }))

  const completeTodo = async (id: string) =>
    await send(async () => await todoControllerComplete({
      path: { id },
      throwOnError: true,
    }))

  const removeTodo = async (id: string) =>
    await send(async () => await todoControllerRemove({
      path: { id },
      throwOnError: true,
    }))

  return {
    addTodo,
    completeTodo,
    removeTodo,
    status,
    todos,
  }
}
