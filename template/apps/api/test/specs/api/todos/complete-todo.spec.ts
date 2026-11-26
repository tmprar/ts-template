import { todoResponseSchema } from '@myapp/contracts'
import request from 'supertest'

import { todoFactory } from '#test/factories/todos.js'
import {
  expectErrorCode,
  parseBody,
} from '#test/helpers/http.js'
import { useTestApp } from '#test/setup/app.js'

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

describe('POST /api/todos/:id/complete', () => {
  const ctx = useTestApp()

  describe('未完了の todo を完了にしたとき', () => {
    it('200 を返し、完了済みとして一覧に出す', async () => {
      const todo = await todoFactory.create()

      const response = await request(ctx.server())
        .post(`/api/todos/${todo.id}/complete`)
        .expect(200)
      const completed = parseBody(response, todoResponseSchema).todo

      expect(completed).toEqual(expect.objectContaining({
        completedAt: expect.any(String) as string,
        id: todo.id,
        status: 'completed',
      }))
      await request(ctx.server())
        .get('/api/todos')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ todos: [completed] })
        })
    })
  })

  describe('すでに完了している todo を指定したとき', () => {
    it('409 を返す', async () => {
      const todo = await todoFactory.create({ completedAt: new Date() })

      await request(ctx.server())
        .post(`/api/todos/${todo.id}/complete`)
        .expect(409)
        .expect(expectErrorCode('TODO_ALREADY_COMPLETED'))
    })
  })

  describe('存在しない todo を指定したとき', () => {
    it('404 を返す', async () => {
      await request(ctx.server())
        .post(`/api/todos/${UNKNOWN_ID}/complete`)
        .expect(404)
        .expect(expectErrorCode('TODO_NOT_FOUND'))
    })
  })

  describe('ID が uuid の形式でないとき', () => {
    it('400 を返す', async () => {
      await request(ctx.server())
        .post('/api/todos/invalid/complete')
        .expect(400)
        .expect(expectErrorCode('INVALID_REQUEST'))
    })
  })
})
