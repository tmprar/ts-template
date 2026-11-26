import {
  http,
  HttpResponse,
} from 'msw'

import type { TodoControllerFindManyResponse } from '~/generated/api/types.gen'

/**
 * テストの既定の応答。画面を開いたときに届く取得の要求に、todo が無い状態として応答する。
 * 更新の要求には既定の応答を置かず、テストの中で`server.use`で足す。足し忘れた更新の要求は、`onUnhandledRequest`でテストを失敗させる
 */
export const handlers = [
  http.get('*/api/todos', () => HttpResponse.json<TodoControllerFindManyResponse>({ todos: [] })),
]
