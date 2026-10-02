import { ClsPluginTransactional } from '@nestjs-cls/transactional'
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm'
import { Module } from '@nestjs/common'
import { SentryModule } from '@sentry/nestjs/setup'
import { ClsModule } from 'nestjs-cls'

import { TodoModule } from '#app/modules/todo/index.js'
import { AppConfigModule } from '#app/platform/config/index.js'
import {
  DRIZZLE,
  DrizzleModule,
} from '#app/platform/drizzle/index.js'
import { HealthModule } from '#app/platform/health/index.js'
import { LoggingModule } from '#app/platform/logging/index.js'

@Module({
  imports: [
    // トレース(リクエストの内訳)の計装。例外の送信は例外フィルタが行う
    SentryModule.forRoot(),
    AppConfigModule,
    LoggingModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          adapter: new TransactionalAdapterDrizzleOrm({
            drizzleInstanceToken: DRIZZLE,
          }),
          imports: [DrizzleModule],
        }),
      ],
    }),
    TodoModule,
    HealthModule,
  ],
})
export class AppModule {}
