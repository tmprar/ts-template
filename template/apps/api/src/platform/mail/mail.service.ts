import type { Result } from 'neverthrow'

import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import {
  err,
  ok,
} from 'neverthrow'

import { AppConfigService } from '#app/platform/config/index.js'

const API_URL = 'https://api.resend.com/emails'

/**
送信APIのタイムアウト。超過時は送信失敗として呼び出し側(ジョブのリトライ)に委ねる
*/
const SEND_TIMEOUT_MS = 5000

/**
送るメール1通。平文で送る
*/
export type Mail = {
  body: string
  subject: string
}

/**
送信の失敗。送信APIの状態コード・タイムアウトはここでこの型に吸収する。

一時的な失敗として一種類だけを持つ。宛先の不正といった直らない失敗も
送信APIの応答からは切り分けられず、リトライの上限で打ち切る扱いに変わりはないため。

`cause` は翻訳前の原因(捕まえた例外・送信APIの状態コード)。
失敗をどう扱うか決めた層がログに出すためだけに運ぶ
*/
export type SendMailError = {
  cause?: unknown
  type: 'MailUnavailable'
}

/**
 * メールの送信基盤(Resend APIとの境界)。送る口だけを担い、メールの中身は知らない。
 * 文面の組み立て・宛先の解決・送る契機・リトライは、その仕事を所有するモジュールが決める
 */
@Injectable()
export class MailService {
  constructor(
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MailService.name)
  }

  /**
   * メールを送信する。
   *
   * 送信の設定(MAIL_FROM・RESEND_API_KEY)が無い開発環境では、外部へ出さず
   * 文面をログに出して成功とみなす。本番では両方が必須なので、この分岐には入らない
   * (env.schema.ts の起動時の検査)
   */
  public async send(
    to: string,
    mail: Mail,
  ): Promise<Result<undefined, SendMailError>> {
    const from = this.config.get('MAIL_FROM', { infer: true })
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true })

    if (from === undefined || apiKey === undefined) {
      this.logger.info(
        {
          body: mail.body,
          event: 'mail_send_skipped',
          subject: mail.subject,
          to,
        },
        '送信の設定が無いためメールを送らずログに出した',
      )

      return ok(undefined)
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
        // 宛先・本文は持ち出さず、送信APIが何を返したかだけを原因に載せる
        return err({
          cause: new Error(`メールの送信APIが${String(response.status)}を返した`),
          type: 'MailUnavailable',
        })
      }

      return ok(undefined)
    } catch (error) {
      return err({
        cause: error,
        type: 'MailUnavailable',
      })
    }
  }
}
