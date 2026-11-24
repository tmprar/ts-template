import { defineConfig } from '@hey-api/openapi-ts'
import { fileURLToPath } from 'node:url'

// APIのOpenAPIから型付きSDKを生成する。生成物はgitignoreし、turboがbuild・typecheck・
// dev前に生成する(generate:api)。
// 入力は@myapp/apiがexportsで公開するopenapi.json。ただしhey-apiのwatchはURL入力しか
// 対応しないため、監視時(generate:api:watch)だけはapi開発サーバーが配信する
// /openapi.jsonを見る
/**
 * パッケージ @myapp/api がexportsで公開するopenapi.jsonのファイルパスを返す。
 * openapi.jsonが未生成で解決に失敗したときは、生成の手順を示す例外を投げる。
 * 解決の失敗をそのまま投げない。そのままでは原因の分かりにくいMODULE_NOT_FOUNDになる
 */
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
  plugins: ['@hey-api/client-axios', {
    mutationKeys: true,
    name: '@tanstack/vue-query',
    /*
      queryKeyにOpenAPIのtag(controllerごとに付く)を含める。必須の引数を持つ取得も、
      引数の値を問わず、tagの前方一致でまとめて取得し直せるようにするため
    */
    queryKeys: { tags: true },
  }],
})
