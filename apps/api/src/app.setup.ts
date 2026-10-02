import type { NestExpressApplication } from '@nestjs/platform-express'

import {
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { AppConfigService } from '#app/platform/config/index.js'

/**
 * 全ルートに付く接頭辞。本番では手前のプロキシ(CDN など)が `/api/*` だけを API に流し、
 * web と同一オリジンで配信する前提(docs/architecture.md)。
 * プロキシは接頭辞を剥がさない想定で、API 側で受ける
 */
export const API_PREFIX = 'api'

/**
 * グローバルなパイプ・インターセプタ・ミドルウェアを登録する。
 * 本番(main.ts)・e2eテスト・OpenAPI生成で共有し、構成差異による挙動の違いを防ぐ。
 */
export function setupApp(app: NestExpressApplication): void {
  const config = app.get(AppConfigService)

  app.setGlobalPrefix(API_PREFIX)

  // TLS を終端するプロキシの後ろで動かす前提のため、API 自身は平文で受ける。
  // これを信頼しないと req.protocol が http のまま、req.ip がプロキシのアドレスのままになる
  app.set('trust proxy', 1)

  // SIGTERM等で終了する際にジョブワーカー(pg-boss)を確実に止める
  app.enableShutdownHooks()

  // 開発ではSPAが別オリジン(ポート違い)のため、配信オリジンのみ許可する
  app.enableCors({
    credentials: true,
    origin: config.get('WEB_APP_ORIGIN', { infer: true }),
  })

  app.useGlobalPipes(new StandardSchemaValidationPipe())
  app.useGlobalInterceptors(
    new StandardSchemaSerializerInterceptor(app.get(Reflector)),
  )
}
