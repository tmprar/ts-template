import {
  http,
  HttpResponse,
} from 'msw'

import {
  findSentRequests,
  server,
} from '#test/mocks/server.js'

const EMAILS_URL = 'https://api.resend.com/emails'

export const resendHandlers = [
  http.post(EMAILS_URL, () => HttpResponse.json({ id: 'mail-1' })),
]

/**
 * システムが送ったメールの宛先・件名・本文を、送った順に返す
 */
export async function findSentMails(): Promise<{
  body: string
  subject: string
  to: string
}[]> {
  const requests = await findSentRequests('POST', /^https:\/\/api\.resend\.com\/emails$/)

  return requests.map((request) => {
    const body = JSON.parse(request.body) as {
      subject: string
      text: string
      to: string[]
    }

    return {
      body: body.text,
      subject: body.subject,
      to: body.to.join(','),
    }
  })
}

/**
 * メールの送信の要求に、status のエラー応答を返す状態にする
 */
export function rejectMailRequest(status: number): void {
  server.use(http.post(EMAILS_URL, () => HttpResponse.json({ message: 'error' }, { status })))
}
