import {
  server,
  setupMockApi,
} from '~~/test/nuxt/mocks/node'
// @vitest-environment nuxt
import { isAxiosError } from 'axios'
import {
  delay,
  http,
  HttpResponse,
} from 'msw'

import { client } from '~/generated/api/client.gen'
import { todoControllerFindMany } from '~/generated/api/sdk.gen'

setupMockApi()

/**
 * 生成クライアントの`/api/todos`の取得に、`respond`の戻り値を応答として返す状態にする
 */
const respondToTodos = (respond: () => Promise<Response> | Response) => {
  server.use(http.get('*/api/todos', respond))
}

/**
 * 生成クライアントで`/api/todos`を取得し、投げられた値を返す。投げられなければundefinedを返す
 */
const caught = async (): Promise<unknown> => {
  try {
    await todoControllerFindMany({ throwOnError: true })
  } catch (error) {
    return error
  }

  return undefined
}

/**
 * `error`のうち、axiosの失敗の種類(`code`)と、応答のステータスと本文を、比べられる形にして返す
 */
const summarize = (error: unknown) => isAxiosError(error)
  ? {
      code: error.code,
      data: error.response?.data as unknown,
      status: error.response?.status,
    }
  : error

describe('生成クライアントが投げる値', () => {
  it('APIのエラー応答は、ステータスと本文を持つAxiosErrorになる', async () => {
    const body = {
      code: 'TODO_NOT_FOUND',
      message: 'todoが見つかりません',
      statusCode: 404,
    }

    respondToTodos(() => HttpResponse.json(body, { status: 404 }))

    expect(summarize(await caught())).toEqual({
      code: 'ERR_BAD_REQUEST',
      data: body,
      status: 404,
    })
  })

  it('本文がJSONでないエラー応答は、本文を解析できなかったことを表すAxiosErrorになり、ステータスを持つ', async () => {
    respondToTodos(() => new HttpResponse('<html>502 Bad Gateway</html>', { status: 502 }))

    expect(summarize(await caught())).toEqual({
      code: 'ERR_BAD_RESPONSE',
      data: '<html>502 Bad Gateway</html>',
      status: 502,
    })
  })

  it('2xxの応答の本文がJSONでないときも、本文を解析できなかったことを表すAxiosErrorになる', async () => {
    respondToTodos(() => new HttpResponse('<!doctype html>', { status: 200 }))

    expect(summarize(await caught())).toEqual({
      code: 'ERR_BAD_RESPONSE',
      data: '<!doctype html>',
      status: 200,
    })
  })

  it('上限の時間までに応答が無いときは、応答を持たないAxiosErrorになる', async () => {
    const { timeout } = client.getConfig()

    onTestFinished(() => {
      client.setConfig({ timeout })
    })
    client.setConfig({ timeout: 10 })
    respondToTodos(async () => {
      await delay('infinite')

      return HttpResponse.json({})
    })

    expect(summarize(await caught())).toEqual({
      code: 'ETIMEDOUT',
      data: undefined,
      status: undefined,
    })
  })

  it('APIに接続できなかったときは、応答を持たないAxiosErrorになる', async () => {
    respondToTodos(() => HttpResponse.error())

    expect(summarize(await caught())).toEqual({
      code: 'ERR_NETWORK',
      data: undefined,
      status: undefined,
    })
  })
})
