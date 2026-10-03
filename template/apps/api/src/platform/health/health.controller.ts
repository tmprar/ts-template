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

/**
死活監視が DB の応答を待つ上限。これを超えたら落ちているとみなす
*/
const DATABASE_TIMEOUT_MS = 3000

/**
 * 死活監視。compose の healthcheck と Route 53 のヘルスチェックが叩く。
 * 認証は課さない。応答は terminus の形式で、秘密の値は含めない。
 * 利用者向けの API ではないので OpenAPI(web のクライアント生成)からは外す
 */
@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  public async check() {
    return await this.health.check([
      () => this.database.check('database').withTimeout(DATABASE_TIMEOUT_MS),
    ])
  }
}
