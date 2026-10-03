import { client } from '~/generated/api/client.gen'

// 生成されたクライアントはimport時に既定値で初期化されるため、
// アプリ起動時にAPIの接続先を注入する。
// Cookieで認証するなら、ここに credentials: 'include' を足す
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  client.setConfig({
    baseUrl: config.public.apiBaseUrl,
  })
})
