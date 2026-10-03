import request from 'supertest'

import { TodoQuery } from '#app/modules/todo/todo.query.js'
import { useTestApp } from '#test/support/app/create-app.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000'

describe('応答の追跡とエラーの見え方', () => {
  describe('リクエストを受けたとき', () => {
    const ctx = useTestApp()

    it('応答ごとに新しいx-request-idを付ける', async () => {
      const first = await request(ctx.server()).get('/api/health').expect(200)
      const second = await request(ctx.server()).get('/api/health').expect(200)

      expect(first.headers['x-request-id']).toMatch(UUID_PATTERN)
      expect(second.headers['x-request-id']).toMatch(UUID_PATTERN)
      expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id'])
    })

    it('クライアントが送ったx-request-idは使わない', async () => {
      const response = await request(ctx.server())
        .get('/api/health')
        .set('x-request-id', 'client-supplied')
        .expect(200)

      expect(response.headers['x-request-id']).toMatch(UUID_PATTERN)
    })
  })

  describe('利用者の誤りで失敗したとき', () => {
    const ctx = useTestApp()

    it('Nestの既定の形のまま返す', async () => {
      const response = await request(ctx.server())
        .delete(`/api/todos/${UNKNOWN_ID}`)
        .expect(404)

      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'todoが見つかりません',
        statusCode: 404,
      })
    })
  })

  describe('想定外の例外が起きたとき', () => {
    // 参照系で内部の例外を起こす
    const ctx = useTestApp({
      configure: builder => builder
        .overrideProvider(TodoQuery)
        .useValue({
          findTodos: async () => await Promise.reject(
            new Error('DB接続情報を含むかもしれない内部メッセージ'),
          ),
        }),
    })

    it('500にし、内部のメッセージは利用者に出さない', async () => {
      const response = await request(ctx.server())
        .get('/api/todos')
        .expect(500)

      expect(response.body).toEqual({
        message: 'Internal server error',
        statusCode: 500,
      })
      expect(response.headers['x-request-id']).toMatch(UUID_PATTERN)
    })
  })
})
