import {
  useMutation,
  useQuery,
} from '@tanstack/vue-query'

import { useNotify } from '~/composables/useNotify'
import {
  todoControllerCompleteMutation,
  todoControllerCreateMutation,
  todoControllerFindManyOptions,
  todoControllerRemoveMutation,
} from '~/generated/api/@tanstack/vue-query.gen'
import { asMutationOptions } from '~/utils/generated-options'

/**
 * 失敗の原因を、通信の失敗とAPIの失敗に分けて案内する文言を返す。
 * 接続の失敗は、axiosの例外に応答(`response`)が無いことで見分ける
 */
const failureMessage = (error: { response?: unknown }, action: string) =>
  error.response === undefined
    ? `通信に失敗したため、todoを${action}できませんでした。通信状況をご確認のうえ、もう一度お試しください。`
    : `todoを${action}できませんでした。しばらくしてからもう一度お試しください。`

/**
 * todoの一覧を取得して`todos`として返し、todoを追加・完了・削除する関数を返す。
 * 更新が終わると、成否を問わず一覧を取得し直す(`meta.invalidates`)
 */
export const useTodos = () => {
  const todosOptions = todoControllerFindManyOptions()

  const todosQuery = useQuery(todosOptions)

  const notify = useNotify()

  const creation = useMutation({
    ...asMutationOptions(todoControllerCreateMutation()),
    meta: { invalidates: [todosOptions.queryKey] },
    onError: (error) => {
      notify.error(failureMessage(error, '追加'))
    },
  })

  const completion = useMutation({
    ...asMutationOptions(todoControllerCompleteMutation()),
    meta: { invalidates: [todosOptions.queryKey] },
    onError: (error) => {
      notify.error(failureMessage(error, '完了に'))
    },
  })

  const removal = useMutation({
    ...asMutationOptions(todoControllerRemoveMutation()),
    meta: { invalidates: [todosOptions.queryKey] },
    onError: (error) => {
      notify.error(failureMessage(error, '削除'))
    },
  })

  return {
    addTodo: creation.mutate,
    completeTodo: completion.mutate,
    isAdding: creation.isPending,
    isPending: todosQuery.isPending,
    removeTodo: removal.mutate,
    /*
      取得し直しに失敗しても、前に取得した一覧を返し続ける(TanStack Queryはdataを残す)。
      一覧が無い(undefined)のは、最初の取得に失敗したときだけである。
      APIの戻り値は推論で受け、画面が使う形(TodoItem)との一致は、使う側の型検査で確かめる
    */
    todos: computed(() => todosQuery.data.value?.todos),
  }
}
