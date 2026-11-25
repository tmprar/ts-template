// @vitest-environment nuxt
import { findShownToasts } from '~~/test/nuxt/helpers/toasts'
import { setupMockApi } from '~~/test/nuxt/mocks/node'

setupMockApi()

/**
 * 動いているビルドのIDを`id`にする。
 * 公開されている最新のビルドの側は差し替えない。Nuxt環境の$fetchは、相対パスの要求をMSWへ渡さずテスト環境の中のサーバへ送り、
 * そのサーバはテスト用のビルドのlatest.jsonを返すため
 */
const runBuild = (id: string) => {
  useRuntimeConfig().app.buildId = id
}

/**
 * タブが再び表示されたときのイベントを送る
 */
const showTab = () => {
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('新しいビルドの通知', () => {
  // 一度検知するとプラグインは確かめるのをやめるため、検知しない場合を先に確かめる
  describe('タブを表示したときに、公開されているビルドが動いているビルドと同じとき', () => {
    it('再読み込みを促さない', async () => {
      showTab()
      await vi.advanceTimersByTimeAsync(500)

      expect(findShownToasts()).toEqual([])
    })
  })

  describe('タブを表示したときに、動いているビルドより新しいビルドが公開されているとき', () => {
    it('再読み込みのボタンを付けて、閉じるまで残るトーストで知らせる', async () => {
      runBuild('old-build')

      showTab()

      await vi.waitFor(() => {
        expect(findShownToasts()).toEqual([{
          duration: 0,
          title: '新しいバージョンがあります',
        }])
      })
      expect(useToast().toasts.value[0]?.actions?.map(action => action.label)).toEqual(['再読み込み'])
    })
  })
})
