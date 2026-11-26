import request from 'supertest'

import { NOTIFY_COMPLETED_TODO_QUEUE } from '#app/modules/todo/job/notify-completed-todo.queue.js'
import { todoFactory } from '#test/factories/todos.js'
import { TEST_ENV } from '#test/fixtures/env.js'
import {
  findSentMails,
  rejectMailRequest,
} from '#test/mocks/resend.js'
import { useTestApp } from '#test/setup/app.js'

describe('todo の完了をメールで知らせるジョブ', () => {
  const ctx = useTestApp()

  describe('todo が完了になったとき', () => {
    it('件名と本文を入れたメールを、設定した宛先へ送る', async () => {
      const todo = await todoFactory.create({ title: '牛乳を買う' })

      await request(ctx.server()).post(`/api/todos/${todo.id}/complete`).expect(200)
      await ctx.jobs.drain()

      expect(ctx.jobs.failures).toEqual([])
      expect(await findSentMails()).toEqual([{
        body: '「牛乳を買う」を完了にしました。\n',
        subject: '【完了】牛乳を買う',
        to: TEST_ENV.TODO_NOTICE_MAIL_TO,
      }])
    })
  })

  describe('メールを送れなかったとき', () => {
    it('ジョブを失敗としてやり直しに回し、完了そのものは残す', async () => {
      const todo = await todoFactory.create()

      rejectMailRequest(500)
      await request(ctx.server()).post(`/api/todos/${todo.id}/complete`).expect(200)
      await ctx.jobs.drain()

      expect(ctx.jobs.failures.map(failure => failure.job.queue)).toEqual([NOTIFY_COMPLETED_TODO_QUEUE])
      await request(ctx.server())
        .get('/api/todos')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ todos: [expect.objectContaining({ status: 'completed' })] })
        })
    })
  })
})
