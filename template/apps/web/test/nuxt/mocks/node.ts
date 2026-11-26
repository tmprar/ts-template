import { enableAutoUnmount } from '@vue/test-utils'
import { handlers } from '~~/test/nuxt/mocks/handlers/defaults'
import { setupServer } from 'msw/node'

export const server = setupServer(...handlers)

/**
 * spec の中で呼び、テストのあいだ API への要求を既定の応答で受ける状態にし、テストごとに描画した画面と取得結果とトーストを消す。
 * サーバの起動を Vitest の setupFiles に置かないのは、Nuxt 環境では setupFiles と spec がこのモジュールを別々に読み込み、
 * spec が`server.use`で足した応答を、setupFiles で起動したサーバが使わないため
 */
export const setupMockApi = () => {
  /*
    既定の応答を用意していない要求でテストを失敗させる。モックの足し忘れを、要求の失敗による別の失敗として
    読み違えないようにするため
  */
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  beforeEach(() => {
    const { $queryClient } = useNuxtApp()

    $queryClient.clear()
    /*
      失敗した取得をリトライさせない。リトライは待ち時間を挟むため、失敗の結果が出るまでに数秒かかる。
      リトライ以外の既定値は、プラグインが設定した値を引き継ぐ。setDefaultOptions は既定値を丸ごと置き換えるので、
      引き継がないと gcTime の 0 が外れ、前の画面の取得結果がキャッシュに残る
    */
    const defaults = $queryClient.getDefaultOptions()

    $queryClient.setDefaultOptions({
      ...defaults,
      queries: {
        ...defaults.queries,
        retry: false,
      },
    })
    useToast().clear()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  /*
    テストが描画した画面を、テストごとにアンマウントする。画面が残ると、入力の確定を待つ保存のように遅れて実行される処理が
    次のテストの中で要求を送り、次のテストのトーストや応答に混ざる
  */
  enableAutoUnmount(afterEach)

  afterAll(() => {
    server.close()
  })
}
