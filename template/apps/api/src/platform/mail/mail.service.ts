import type { Result } from 'neverthrow'

import { Injectable } from '@nestjs/common'
import {
  err,
  ok,
} from 'neverthrow'

import { AppConfigService } from '#app/platform/config/index.js'

const API_URL = 'https://api.resend.com/emails'

/**
 * この時間を超えた送信は待ち続けず、失敗として返す。再送は MailService では行わず、ジョブのリトライで行う
 */
const SEND_TIMEOUT_MS = 5000

export type Mail = {
  body: string
  subject: string
}

export type MailDelivery = 'sent' | 'skipped'

/**
 * メールの送信の失敗。`cause` は、失敗をどう扱うか決める側がログに出すための原因である。
 * 失敗の種類は、リトライで解消する失敗と解消しない失敗に分けず、1つだけにする。
 * 宛先の不正のようにリトライしても解消しない失敗も、送信APIの応答からは区別できないため
 */
export type SendMailError = {
  cause: unknown
  type: 'MailApiUnavailable'
}

/**
 * 業務のルールを持たず、メールを送信する機能だけを提供する。
 * 文面・宛先・送る契機・リトライの方針は、このクラスでは決めない。仕事を所有するモジュールが決める
 */
@Injectable()
export class MailService {
  constructor(private readonly config: AppConfigService) {}

  /**
   * `to` 宛てにメールを 1 通送って `sent` を返し、送信の設定(MAIL_FROM・RESEND_API_KEY)のどちらかが無いときは送信APIへ要求を送らず `skipped` を返す。
   * 送信の設定が無いことは失敗として返さない。本番では両方の設定が必須で、env.schema.ts が起動時に検査するため、
   * 設定が無いのは本番以外に限られる
   */
  public async send(
    to: string,
    mail: Mail,
  ): Promise<Result<MailDelivery, SendMailError>> {
    const from = this.config.get('MAIL_FROM', { infer: true })
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true })

    if (from === undefined || apiKey === undefined) {
      return ok('skipped')
    }

    try {
      const response = await fetch(API_URL, {
        body: JSON.stringify({
          from,
          subject: mail.subject,
          text: mail.body,
          to: [to],
        }),
        headers: {
          ['Authorization']: `Bearer ${apiKey}`,
          ['Content-Type']: 'application/json',
        },
        method: 'POST',
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      })

      if (!response.ok) {
        return err({
          cause: new Error(`メールの送信APIが${String(response.status)}を返した`),
          type: 'MailApiUnavailable',
        })
      }

      return ok('sent')
    } catch (error) {
      return err({
        cause: error,
        type: 'MailApiUnavailable',
      })
    }
  }
}
