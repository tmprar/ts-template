import {
  AxiosError,
  AxiosHeaders,
} from 'axios'

import { shouldRetry } from '~/utils/api-error'

/**
 * APIがステータス`status`のエラー応答を返したときに、生成クライアント(axios)が投げる例外を返す
 */
const responseError = (status: number) => new AxiosError('Request failed', undefined, undefined, undefined, {
  config: { headers: new AxiosHeaders() },
  data: {},
  headers: {},
  status,
  statusText: '',
})

describe('shouldRetry', () => {
  it('APIに接続できなかったときはリトライする', () => {
    expect(shouldRetry(0, new AxiosError('Network Error', AxiosError.ERR_NETWORK))).toBe(true)
  })

  it('axiosが投げたものでない失敗はリトライする', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
  })

  it('APIが5xxを返したときはリトライする', () => {
    expect(shouldRetry(0, responseError(503))).toBe(true)
  })

  it('APIが4xxを返したときはリトライしない', () => {
    expect(shouldRetry(0, responseError(409))).toBe(false)
  })

  it('3回失敗したあとはリトライしない', () => {
    expect(shouldRetry(3, responseError(503))).toBe(false)
  })
})
