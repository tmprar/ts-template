import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'

import { DrizzleModule } from '#app/platform/drizzle/index.js'
import { DatabaseHealthIndicator } from '#app/platform/health/database.health.js'
import { HealthController } from '#app/platform/health/health.controller.js'

@Module({
  controllers: [HealthController],
  imports: [
    DrizzleModule,
    // 確認の失敗時に terminus が出すログを、ほかのログ(構造化ログ)と同じ 1 行の JSON にする
    TerminusModule.forRoot({ errorLogStyle: 'json' }),
  ],
  providers: [DatabaseHealthIndicator],
})
export class HealthModule {}
