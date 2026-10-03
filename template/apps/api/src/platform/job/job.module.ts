import { Module } from '@nestjs/common'

import { AppConfigModule } from '#app/platform/config/index.js'
import { JobQueueService } from '#app/platform/job/job-queue.service.js'

/**
 * ジョブキュー基盤。非同期実行の口(投入・ワーカー登録)のみを提供し、
 * ジョブの中身は持たない
 */
@Module({
  exports: [JobQueueService],
  imports: [AppConfigModule],
  providers: [JobQueueService],
})
export class JobModule {}
