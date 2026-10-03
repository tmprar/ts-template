import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'

import { DrizzleModule } from '#app/platform/drizzle/index.js'
import { DatabaseHealthIndicator } from '#app/platform/health/database.health.js'
import { HealthController } from '#app/platform/health/health.controller.js'

@Module({
  controllers: [HealthController],
  imports: [
    DrizzleModule,
    // 失敗時に terminus が出すログは 1 行の JSON にする(構造化ログに揃える)
    TerminusModule.forRoot({ errorLogStyle: 'json' }),
  ],
  providers: [DatabaseHealthIndicator],
})
export class HealthModule {}
