import { setupServer } from 'msw/node'

export type SentRequest = {
  body: string
  method: string
  url: URL
}

/**
 * 外部サービスへの要求を受ける MSW のサーバ。既定の応答は setupFiles が登録する
 */
export const server = setupServer()

const sentRequests: Promise<SentRequest>[] = []

/**
 * 送った要求の記録を消す
 */
export function clearSentRequests(): void {
  sentRequests.length = 0
}

/**
 * テストの中でシステムが外部サービスへ送った要求のうち、method と、URL が urlPattern に一致するものを、送った順に返す
 */
export async function findSentRequests(method: string, urlPattern: RegExp): Promise<SentRequest[]> {
  const requests = await Promise.all(sentRequests)

  return requests.filter(request => request.method === method && urlPattern.test(request.url.href))
}

/**
 * url がテストの中で起動したアプリ(supertest が送る先)を指すときに true を返す
 */
export function isLocal(url: URL): boolean {
  return ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)
}

/**
 * 以後にシステムが外部サービスへ送った要求を、`findSentRequests` で読めるように記録し始める
 */
export function recordSentRequests(): void {
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)

    if (!isLocal(url)) {
      sentRequests.push(readRequest(request.clone(), url))
    }
  })
}

/**
 * request の本文を読み、記録する形にして返す
 */
async function readRequest(request: Request, url: URL): Promise<SentRequest> {
  return {
    body: await request.text(),
    method: request.method,
    url,
  }
}
