import type { NuxtAppManifestMeta } from '#app'

import { useNotify } from '~/composables/useNotify'

/*
  Nuxtの新しいビルドの確認はタイマーでしか動かず、バックグラウンドのタブではブラウザがタイマーを間引く。
  放置したタブへ戻ったときに古いままにならないよう、タブが再び表示されたときにもlatest.jsonを取得して比べる。
  Nuxtの確認の関数は外から呼べないため、取得はここに書く
*/
export default defineNuxtPlugin((nuxtApp) => {
  const { app } = useRuntimeConfig()
  const notify = useNotify()
  let isDetected = false

  nuxtApp.hook('app:manifest:update', () => {
    if (isDetected) return

    isDetected = true
    notify.prompt('新しいバージョンがあります', {
      label: '再読み込み',
      onClick: () => {
        reloadNuxtApp({ force: true })
      },
    })
  })

  useEventListener(document, 'visibilitychange', async () => {
    if (isDetected || document.visibilityState !== 'visible') return

    let latest: NuxtAppManifestMeta

    try {
      // 前回の取得の結果をブラウザのキャッシュから読まないよう、Nuxtの確認と同じく毎回異なるクエリを付ける
      latest = await $fetch<NuxtAppManifestMeta>(`${app.buildAssetsDir}builds/latest.json`, {
        baseURL: app.baseURL,
        query: { t: Date.now() },
      })
    } catch {
      // 取得に失敗しても利用者の操作には関わらないので、知らせずに次にタブを表示したときに確かめ直す
      return
    }

    if (latest.id !== app.buildId) {
      await nuxtApp.callHook('app:manifest:update', latest)
    }
  })
})
