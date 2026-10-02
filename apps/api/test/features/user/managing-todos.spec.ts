import type { TodoResponse } from '@myapp/contracts'

import request from 'supertest'

import { useTestApp } from '#test/support/app/create-app.js'
import {
  completeTodo,
  createCompletedTodo,
  createTodo,
  deleteTodo,
  findTodos,
} from '#test/support/todos.js'

const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000'

describe('利用者がやることを管理する', () => {
  const ctx = useTestApp()

  describe('todoを追加したとき', () => {
    it('未完了のtodoとして一覧に出る', async () => {
      const todo = await createTodo(ctx, '牛乳を買う')

      expect(await findTodos(ctx)).toEqual([{
        completedAt: null,
        createdAt: todo.createdAt,
        id: todo.id,
        status: 'incomplete',
        title: '牛乳を買う',
      }])
    })

    it('追加した順に並ぶ', async () => {
      await createTodo(ctx, '牛乳を買う')
      await createTodo(ctx, '洗濯する')

      const todos = await findTodos(ctx)

      expect(todos.map(todo => todo.title)).toEqual(['牛乳を買う', '洗濯する'])
    })
  })

  describe('todoを完了にしたとき', () => {
    it('完了済みとして一覧に出る', async () => {
      const todo = await createTodo(ctx, '牛乳を買う')

      const response = await completeTodo(ctx, todo.id).expect(200)
      const completed = (response.body as TodoResponse).todo

      expect(completed.status).toBe('completed')
      expect(await findTodos(ctx)).toEqual([completed])
    })
  })

  describe('すでに完了しているとき', () => {
    it('もう一度完了にはできず409', async () => {
      const todo = await createCompletedTodo(ctx, '牛乳を買う')

      await completeTodo(ctx, todo.id).expect(409)
    })
  })

  describe('todoを削除したとき', () => {
    it('一覧から消える', async () => {
      const todo = await createTodo(ctx, '牛乳を買う')

      await deleteTodo(ctx, todo.id).expect(204)

      expect(await findTodos(ctx)).toEqual([])
    })
  })

  describe('存在しないtodoを指定したとき', () => {
    it('完了は404', async () => {
      await completeTodo(ctx, UNKNOWN_ID).expect(404)
    })

    it('削除は404', async () => {
      await deleteTodo(ctx, UNKNOWN_ID).expect(404)
    })
  })

  describe('入力の形式が不正なとき', () => {
    it.each([
      ['件名がない', {}],
      ['件名が文字列でない', { title: 1 }],
      ['件名が空白だけ', { title: '  ' }],
      ['件名が上限を超える', { title: 'あ'.repeat(101) }],
    ])('追加のとき、%s と400になる', async (_name, payload) => {
      await request(ctx.server())
        .post('/api/todos')
        .send(payload)
        .expect(400)
    })

    it('IDがuuidの形式でないと400', async () => {
      await completeTodo(ctx, 'invalid').expect(400)
    })
  })
})
