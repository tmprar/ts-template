import { isAxiosError } from 'axios'

const MAX_RETRY_COUNT = 3

/**
 * 失敗した取得をリトライするかどうかを返す。`failureCount`は、それまでに失敗した回数である。
 * APIが4xxを返したときはリトライしない。未ログインや対象が無いことによる失敗は、同じ要求を送り直しても結果が変わらないため
 */
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  const status = isAxiosError(error) ? error.response?.status : undefined
  const isClientError = status !== undefined && status >= 400 && status < 500

  return failureCount < MAX_RETRY_COUNT && !isClientError
}
