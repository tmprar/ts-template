import { defineConfig } from '@hey-api/openapi-ts'
import { fileURLToPath } from 'node:url'

// APIのOpenAPIから型付きSDKを生成する。生成物はgitignoreし、turboがbuild・typecheck・
// dev前に生成する(generate:api)。
// 入力は@myapp/apiがexportsで公開するopenapi.json。ただしhey-apiのwatchはURL入力しか
// 対応しないため、監視時(generate:api:watch)だけはapi開発サーバーが配信する
// /openapi.jsonを見る
// 未生成だと解決に失敗し原因の分かりにくいMODULE_NOT_FOUNDになるため、案内に置き換える
function openApiPath(): string {
  try {
    return fileURLToPath(import.meta.resolve('@myapp/api/openapi.json'))
  } catch {
    throw new Error(
      '@myapp/api/openapi.json が見つかりません。`pnpm turbo generate:openapi` で先に生成してください。',
    )
  }
}

export default defineConfig({
  input: openApiPath(),
  output: {
    /*
      まとめてre-exportするindex.tsを作らせない。
      入口があると生成型を ~/generated/api から手軽にimportできてしまうため、
      使ってよいSDKだけをファイル指定で取りに行く形にする
    */
    entryFile: false,
    path: 'app/generated/api',
  },
  plugins: ['@hey-api/client-fetch'],
})
