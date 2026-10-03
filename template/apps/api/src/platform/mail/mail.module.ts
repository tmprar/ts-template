import { Module } from '@nestjs/common'

import { AppConfigModule } from '#app/platform/config/index.js'
import { MailService } from '#app/platform/mail/mail.service.js'

/**
 * メールの送信基盤。送る口(MailService)のみを提供し、メールの中身は持たない
 */
@Module({
  exports: [MailService],
  imports: [AppConfigModule],
  providers: [MailService],
})
export class MailModule {}
