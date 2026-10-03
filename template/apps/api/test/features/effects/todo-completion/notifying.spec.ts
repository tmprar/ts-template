import { err } from 'neverthrow'

import { useTestApp } from '#test/support/app/create-app.js'
import {
  findSentMails,
  NOTICE_MAIL_TO,
} from '#test/support/mails.js'
import {
  completeTodo,
  createTodo,
  findTodos,
} from '#test/support/todos.js'

const JOB_TEST_TIMEOUT_MS = 30_000

// 通知は非同期ジョブで送るため、ジョブキューを実際に動かす
describe('todoの完了をメールで知らせる', () => {
  const ctx = useTestApp({ jobQueue: 'real' })

  describe('todoが完了になったとき', () => {
    it('件名を入れたメールが、設定した宛先へ送られる', async () => {
      const todo = await createTodo(ctx, '牛乳を買う')

      await completeTodo(ctx, todo.id).expect(200)

      expect(await findSentMails(ctx)).toEqual([{
        body: '「牛乳を買う」を完了にしました。\n',
        subject: '【完了】牛乳を買う',
        to: NOTICE_MAIL_TO,
      }])
    }, JOB_TEST_TIMEOUT_MS)
  })

  describe('メールを送れなかったとき', () => {
    it('完了そのものは成立している', async () => {
      // 失敗の注入は送信APIの応答ではなく送信基盤のエラーで行う
      ctx.mocks.mail.send.mockResolvedValue(err({ type: 'MailUnavailable' }))
      const todo = await createTodo(ctx, '牛乳を買う')

      await completeTodo(ctx, todo.id).expect(200)
      await findSentMails(ctx)

      const todos = await findTodos(ctx)

      expect(todos.map(row => row.status)).toEqual(['completed'])
    }, JOB_TEST_TIMEOUT_MS)
  })
})
