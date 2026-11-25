import request from 'supertest'

import { todoFactory } from '#test/factories/todos.js'
import { expectErrorCode } from '#test/helpers/http.js'
import { useTestApp } from '#test/setup/app.js'

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

describe('DELETE /api/todos/:id', () => {
  const ctx = useTestApp()

  describe('todo を削除したとき', () => {
    it('204 を返し、一覧から消す', async () => {
      const todo = await todoFactory.create()

      await request(ctx.server())
        .delete(`/api/todos/${todo.id}`)
        .expect(204)

      await request(ctx.server())
        .get('/api/todos')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ todos: [] })
        })
    })
  })

  describe('存在しない todo を指定したとき', () => {
    it('404 を返す', async () => {
      await request(ctx.server())
        .delete(`/api/todos/${UNKNOWN_ID}`)
        .expect(404)
        .expect(expectErrorCode('TODO_NOT_FOUND'))
    })
  })
})
