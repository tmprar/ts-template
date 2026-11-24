import { todoResponseSchema } from '@myapp/contracts'
import request from 'supertest'

import { parseBody } from '#test/helpers/http.js'
import { useTestApp } from '#test/setup/app.js'

describe('POST /api/todos', () => {
  const ctx = useTestApp()

  describe('件名を送ったとき', () => {
    it('201 を返し、未完了の todo として一覧に出す', async () => {
      const response = await request(ctx.server())
        .post('/api/todos')
        .send({ title: '牛乳を買う' })
        .expect(201)
      const { todo } = parseBody(response, todoResponseSchema)

      expect(todo).toEqual({
        completedAt: null,
        createdAt: expect.any(String) as string,
        id: expect.any(String) as string,
        status: 'incomplete',
        title: '牛乳を買う',
      })
      await request(ctx.server())
        .get('/api/todos')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ todos: [todo] })
        })
    })

    it('件名の前後の空白を除いて保存する', async () => {
      const response = await request(ctx.server())
        .post('/api/todos')
        .send({ title: '  牛乳を買う  ' })
        .expect(201)

      expect(parseBody(response, todoResponseSchema).todo.title).toBe('牛乳を買う')
    })
  })

  describe('入力の形式が不正なとき', () => {
    it.each([
      ['件名がない', {}],
      ['件名が文字列でない', { title: 1 }],
      ['件名が空白だけ', { title: '  ' }],
      ['件名が上限を超える', { title: 'あ'.repeat(101) }],
    ])('%s と 400 を返す', async (_name, payload) => {
      await request(ctx.server())
        .post('/api/todos')
        .send(payload)
        .expect(400)
    })
  })
})
