// Sentry が依存 package の読み込み時に計装を組み込めるよう、この import を先頭に置く
import '#app/instrument.js'

import type { NestExpressApplication } from '@nestjs/platform-express'
import type {
  Request,
  Response,
} from 'express'

import { NestFactory } from '@nestjs/core'
import { apiReference } from '@scalar/nestjs-api-reference'
import { Logger } from 'nestjs-pino'

import { AppModule } from '#app/app.module.js'
import {
  API_PREFIX,
  setupApp,
} from '#app/app.setup.js'
import { AppConfigService } from '#app/platform/config/index.js'
import {
  createOpenApiDocument,
  writeOpenApiDocument,
} from '#app/platform/http/index.js'

/**
 * API サーバを起動して PORT でリクエストの待ち受けを始め、本番以外では OpenAPI ドキュメントのファイルへの書き出しと、
 * API リファレンス(`/api/docs`)・`/api/openapi.json` の配信も行う
 */
async function bootstrap() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment -- Nest がオプションの型を interface でなく class で宣言しているため
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })
  const config = app.get(AppConfigService)

  app.useLogger(app.get(Logger))

  setupApp(app)

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const document = createOpenApiDocument(app)

    await writeOpenApiDocument(document)
    app.use(`/${API_PREFIX}/docs`, apiReference({ content: document }))
    // OpenAPIはファイルへの書き出しだけにせず、HTTPでも配信する。hey-apiのwatchはURLの入力にだけ対応するため。
    // nest --watchが再起動するたびに最新の内容が返り、webのクライアントが再生成される
    app.use(
      `/${API_PREFIX}/openapi.json`,
      (_request: Request, response: Response) => {
        response.json(document)
      },
    )
  }

  await app.listen(config.get('PORT', { infer: true }))
}
await bootstrap()
