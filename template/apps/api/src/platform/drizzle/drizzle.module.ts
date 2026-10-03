import type { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm'

import { Module } from '@nestjs/common'
import {
  drizzle,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from '#app/db/schema.js'
import { AppConfigService } from '#app/platform/config/index.js'

export const DRIZZLE = Symbol('DRIZZLE')

/**
TransactionHost<DrizzleAdapter> の型引数に使う
*/
export type DrizzleAdapter
  = TransactionalAdapterDrizzleOrm<DrizzleDb>

export type DrizzleDb = NodePgDatabase<typeof schema>

@Module({
  exports: [DRIZZLE],
  providers: [
    {
      inject: [AppConfigService],
      provide: DRIZZLE,
      useFactory: (config: AppConfigService): DrizzleDb =>
        drizzle({
          client: new pg.Pool({
            connectionString: config.get('DATABASE_URL', { infer: true }),
          }),
          schema,
        }),
    },
  ],
})
export class DrizzleModule {}
