import type { Result } from 'neverthrow'

import { Injectable } from '@nestjs/common'
import { ok } from 'neverthrow'

import type {
  NotifyCompletedTodoError,
  Todo,
  TodoGateway,
} from '#app/modules/todo/todo.domain.js'

import { AppConfigService } from '#app/platform/config/index.js'
import { MailService } from '#app/platform/mail/index.js'

/**
 * todoについての連絡をメールで外へ出す。
 * 文面はここで組み立て、送信だけを送信基盤(platform/mail)へ頼む
 */
@Injectable()
export class MailTodoGateway implements TodoGateway {
  constructor(
    private readonly config: AppConfigService,
    private readonly mail: MailService,
  ) {}

  /**
   * todoの完了をメールで知らせる。宛先が未設定のときは、何もせず成功として終える
   */
  public async notifyCompletedTodo(
    todo: Todo,
  ): Promise<Result<undefined, NotifyCompletedTodoError>> {
    const to = this.config.get('TODO_NOTICE_MAIL_TO', { infer: true })

    if (to === undefined) {
      return ok(undefined)
    }

    const sent = await this.mail.send(to, {
      body: `「${todo.title}」を完了にしました。`,
      subject: `【完了】${todo.title}`,
    })

    // 送信基盤の失敗を、このモジュールの失敗の型へ写して返す(原因は `cause` で運ぶ)
    return sent.mapErr((failure): NotifyCompletedTodoError => ({
      cause: failure.cause,
      type: 'NoticeUnavailable',
    }))
  }
}
