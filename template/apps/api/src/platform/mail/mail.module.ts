import { Module } from '@nestjs/common'

import { AppConfigModule } from '#app/platform/config/index.js'
import { MailService } from '#app/platform/mail/mail.service.js'

@Module({
  exports: [MailService],
  imports: [AppConfigModule],
  providers: [MailService],
})
export class MailModule {}
