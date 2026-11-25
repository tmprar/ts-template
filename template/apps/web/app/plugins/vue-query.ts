import {
  MutationCache,
  QueryClient,
  type QueryKey,
  VueQueryPlugin,
} from '@tanstack/vue-query'

import { shouldRetry } from '~/utils/api-error'

/*
  QueryClientをVueQueryPluginに作らせず、このプラグインで作って$queryClientとしても提供する。
  ミドルウェアのようにコンポーネントのsetupの外で動く処理は、useQueryを使えず、QueryClientを直接呼ぶ。

  取得結果は、購読する画面が無くなったらキャッシュから削除する(gcTimeの0)。画面を開くたびに、取得が終わるまでは値が無く、
  取得し直した値だけを表示する。キャッシュに残すと、画面を開いた直後に前回の取得結果が表示され、
  取得した値を最初の1回だけ入力欄へ入れる画面では、前回の取得結果が入力欄の初期値になる

  更新も、購読する画面が無くなったらMutationCacheから削除する。キャッシュに残す更新は、更新ごとにgcTimeを指定する
*/
declare module '@tanstack/vue-query' {
  interface Register {
    mutationMeta: {
      /**
       * 更新が終わったあとに、成功・失敗を問わず取得し直す取得のqueryKey。前方一致で照合する。
       * 失敗したときも取得し直すのは、失敗の原因が、ほかの画面での変更でありうるためである
       */
      invalidates?: readonly QueryKey[]
    }
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  /*
    更新が成功したときは、取得し直すのが終わるまで待つ。待つあいだは更新がpendingのままになり、保存の状態の表示が、
    取得し直した値が画面に出るまで「保存中」のままになる。
    失敗したときは、取得し直しを始めるだけで待たない。失敗はトーストですぐに伝わり、取得し直した値を待って見せるものが無い。
    待つと、取得し直しの失敗の再試行(最大3回、1・2・4秒の間隔)や応答の時間切れが終わるまで、操作のボタンが「保存中」のまま押せなくなる
  */
  const mutationCache = new MutationCache({
    onSettled: async (_data, error, _variables, _context, mutation) => {
      const queryKeys = mutation.meta?.invalidates ?? []

      /*
        取得し直す前に、途中の取得を取り消す。データがまだ無い取得の途中で取得し直しを求めると、TanStack Query は
        新しい要求を送らずに途中の取得の結果を使うため、更新の前に送った要求の結果が表示され、更新が画面に出ない
      */
      const refetching = Promise.all(queryKeys.map(async (queryKey) => {
        await queryClient.cancelQueries({ queryKey })
        await queryClient.invalidateQueries({ queryKey })
      }))

      if (error === null) {
        await refetching
      }
    },
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        gcTime: 0,
      },
      queries: {
        gcTime: 0,
        retry: shouldRetry,
      },
    },
    mutationCache,
  })

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

  return {
    provide: {
      queryClient,
    },
  }
})
