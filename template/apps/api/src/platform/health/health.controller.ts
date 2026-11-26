import {
  Controller,
  Get,
} from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import {
  HealthCheck,
  HealthCheckService,
} from '@nestjs/terminus'

import { DatabaseHealthIndicator } from '#app/platform/health/database.health.js'

const DATABASE_TIMEOUT_MS = 3000

/**
 * compose の healthcheck と Route 53 のヘルスチェックがリクエストを送る先。認証は要求せず、応答は terminus の形式で、秘密の値は含めない。
 * web のクライアント生成の入力である OpenAPI には含めない。利用者向けの API ではないため
 */
@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  /**
   * 稼働状況を確認
   *
   * 死活監視のリクエストを受け付ける。プロセスが動作していることに加えて DB へ接続できるかを確認し、接続できなければ 503 を返す。
   * DB が応答しないときに監視への応答が返らないままにならないよう、DB の確認にはタイムアウトを付ける
   */
  @Get()
  @HealthCheck()
  public async check() {
    return await this.health.check([
      () => this.database.check('database').withTimeout(DATABASE_TIMEOUT_MS),
    ])
  }
}
