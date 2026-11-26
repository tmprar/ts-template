import { Module } from '@nestjs/common'

import { AppConfigModule } from '#app/platform/config/index.js'
import { JobQueueService } from '#app/platform/job/job-queue.service.js'

@Module({
  exports: [JobQueueService],
  imports: [AppConfigModule],
  providers: [JobQueueService],
})
export class JobModule {}
