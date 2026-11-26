import { client } from '~/generated/api/client.gen'

/*
  APIの応答を待つ時間の上限(ミリ秒)。応答しない要求をクライアントで打ち切り、画面が待ち続けないようにする。
  APIの前にプロキシ(CloudFrontなど)を置くときは、プロキシが応答を打ち切る時間より短くする
*/
const REQUEST_TIMEOUT_MS = 15_000

// 生成されたクライアントはimport時に既定値で初期化されるため、アプリ起動時にAPIの接続先を設定する。
// Cookieで認証するなら、ここに withCredentials: true を足す
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  client.setConfig({
    /*
      要求はXMLHttpRequest(axiosのブラウザでの既定)ではなく、fetchで送る。webの結合テストを実行するNuxt環境(happy-dom)では、
      XMLHttpRequestで送った要求が応答を返さず、アプリの起動が打ち切られる
    */
    adapter: 'fetch',
    baseURL: config.public.apiBaseUrl,
    timeout: REQUEST_TIMEOUT_MS,
    /*
      本文をJSONとして読めない応答を、読めたものとして扱わず、失敗(AxiosErrorのERR_BAD_RESPONSE)にする。
      axiosの既定では、JSONとして読めない本文は文字列のまま応答のデータになり、型の上では応答のオブジェクトとして扱われる
    */
    transitional: { silentJSONParsing: false },
  })
})
