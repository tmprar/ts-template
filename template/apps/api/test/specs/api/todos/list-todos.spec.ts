import { todoListResponseSchema } from '@myapp/contracts'
import request from 'supertest'

import { todoFactory } from '#test/factories/todos.js'
import { parseBody } from '#test/helpers/http.js'
import { useTestApp } from '#test/setup/app.js'

describe('GET /api/todos', () => {
  const ctx = useTestApp()

  describe('todo があるとき', () => {
    it('作った順に並べ、完了済みかどうかを status で返す', async () => {
      const open = await todoFactory.create({ title: '牛乳を買う' })
      const done = await todoFactory.create({
        completedAt: new Date(),
        title: '洗濯する',
      })

      const response = await request(ctx.server()).get('/api/todos').expect(200)

      expect(parseBody(response, todoListResponseSchema).todos).toEqual([
        expect.objectContaining({
          id: open.id,
          status: 'incomplete',
          title: '牛乳を買う',
        }),
        expect.objectContaining({
          id: done.id,
          status: 'completed',
          title: '洗濯する',
        }),
      ])
    })
  })

  describe('todo が無いとき', () => {
    it('空の一覧を返す', async () => {
      const response = await request(ctx.server()).get('/api/todos').expect(200)

      expect(parseBody(response, todoListResponseSchema)).toEqual({ todos: [] })
    })
  })
})
