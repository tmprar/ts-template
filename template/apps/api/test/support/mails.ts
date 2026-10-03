import type { TestApp } from '#test/support/app/create-app.js'

type SentMail = {
  body: string
  subject: string
  to: string
}

/**
テストで通知を受け取る宛先(TODO_NOTICE_MAIL_TO)。test/setup/setup-db.ts が設定する
*/
export const NOTICE_MAIL_TO = 'todo-owner@example.com'

/**
システムが送ったメール。非同期ジョブで送るため件数が揃うまで待つ
*/
export async function findSentMails(
  ctx: TestApp,
  count = 1,
): Promise<SentMail[]> {
  await vi.waitFor(
    () => {
      expect(ctx.mocks.mail.send.mock.calls.length)
        .toBeGreaterThanOrEqual(count)
    },
    {
      interval: 250,
      timeout: 15_000,
    },
  )

  return (
    ctx.mocks.mail.send.mock.calls as [
      string,
      {
        body: string
        subject: string
      },
    ][]
  ).map(([to, mail]) => ({
    body: mail.body,
    subject: mail.subject,
    to,
  }))
}
