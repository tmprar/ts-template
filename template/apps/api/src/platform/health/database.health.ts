import {
  Inject,
  Injectable,
} from '@nestjs/common'
import {
  type HealthCheckAttempt,
  HealthIndicatorService,
} from '@nestjs/terminus'
import { sql } from 'drizzle-orm'

import {
  DRIZZLE,
  type DrizzleDb,
} from '#app/platform/drizzle/index.js'

/**
 * PostgreSQL に届くかを `select 1` で確かめる。terminus に Drizzle 用の
 * 組み込みが無いため自前で持つ。タイムアウトは呼び出し側が `withTimeout` で付ける
 */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  public check(key: string): HealthCheckAttempt {
    return this.healthIndicator
      .check(key)
      .attempt(async () => { await this.db.execute(sql`select 1`) })
  }
}
