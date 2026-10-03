// Sentry の計装は他のどの import よりも先に読む(instrument.ts)
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

async function bootstrap() {
  // ロガーを pino に差し替えるまでのログを溜めておく(setupApp が useLogger する)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })
  const config = app.get(AppConfigService)

  // Nest 自身のログも pino に流す。溜めていたログはここで吐かれる
  app.useLogger(app.get(Logger))

  setupApp(app)

  // APIリファレンス(Scalar)とOpenAPIは開発者向けのため、本番では配信しない
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const document = createOpenApiDocument(app)

    await writeOpenApiDocument(document)
    app.use(`/${API_PREFIX}/docs`, apiReference({ content: document }))
    // hey-apiのwatchはURL入力のみ対応のため、開発時はOpenAPIをHTTPでも配信する。
    // nest --watchの再起動ごとに最新の内容が返り、webのクライアントが再生成される
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
