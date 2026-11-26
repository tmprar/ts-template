import { server } from '~~/test/nuxt/mocks/node'
import {
  http,
  HttpResponse,
} from 'msw'

type Method = 'delete' | 'get' | 'patch' | 'post' | 'put'

/**
 * `method`の`path`への要求に、APIが`code`の原因でステータス`status`の失敗を返す状態にする
 */
export const rejectRequest = (method: Method, path: string, status: number, code: string) => {
  server.use(http[method](`*${path}`, () => HttpResponse.json({
    code,
    message: '開発者向けの説明',
    statusCode: status,
  }, { status })))
}

/**
 * `method`の`path`への要求が、APIに接続できずに失敗する状態にする。`once`をtrueにすると、次の1回の要求だけを失敗させる
 */
export const disconnectRequest = (method: Method, path: string, { once = false }: { once?: boolean } = {}) => {
  server.use(http[method](`*${path}`, () => HttpResponse.error(), { once }))
}

/**
 * `method`の`path`への次の1回の要求を、返した関数を呼ぶまで応答させずに待たせる。待たせたあとの応答は、この関数より前に用意した応答が返す。
 * 応答を返さずに次のハンドラへ渡すのは、待たせる処理を、失敗や成功を返す関数ごとに用意せずに組み合わせられるようにするためである
 */
export const holdRequest = (method: Method, path: string) => {
  const { promise, resolve } = Promise.withResolvers<undefined>()

  server.use(http[method](`*${path}`, async () => {
    await promise
  }, { once: true }))

  return () => {
    resolve(undefined)
  }
}
