import { resendHandlers } from '#test/mocks/resend.js'
import {
  clearSentRequests,
  isLocal,
  recordSentRequests,
  server,
} from '#test/mocks/server.js'

/*
  応答を用意していない外部への要求でテストを失敗させる。実際の外部サービスへ要求が出ないようにし、
  ハンドラの足し忘れを、外部の失敗による別の失敗として読み違えないようにするため。supertest がアプリへ送る要求は通す。
  外部サービスを足したら、そのハンドラを test/mocks/ に置いてここで登録する
*/
beforeAll(() => {
  server.resetHandlers(...resendHandlers)
  recordSentRequests()
  server.listen({
    onUnhandledRequest: (request, print) => {
      if (!isLocal(new URL(request.url))) {
        print.error()
      }
    },
  })
})

afterEach(() => {
  server.resetHandlers()
  clearSentRequests()
})

afterAll(() => {
  server.close()
})
