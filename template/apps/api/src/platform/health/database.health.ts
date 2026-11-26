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
 * terminus の組み込みの indicator は使わない。terminus に Drizzle 用の indicator が無いため
 */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  /**
   * DB へ問い合わせを 1 回送り、成功すれば `key` の項目を up、問い合わせが例外を投げれば down とする確認(`HealthCheckAttempt`)を返す
   */
  public check(key: string): HealthCheckAttempt {
    return this.healthIndicator
      .check(key)
      .attempt(async () => { await this.db.execute(sql`select 1`) })
  }
}
