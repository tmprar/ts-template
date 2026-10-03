// openapi.json を生成するスクリプト。
// @nestjs/swagger CLIプラグイン(introspectComments)の変換はnest build時にしか
// 適用されないため、一緒にビルドされた後の dist/scripts/generate-openapi.js を実行することで動作させる。
// ビルドはturboのgenerate:openapiタスク(dependsOn: build)が先行して行う
import type { NestExpressApplication } from '@nestjs/platform-express'

import { NestFactory } from '@nestjs/core'

import { AppModule } from '#app/app.module.js'
import { setupApp } from '#app/app.setup.js'
import {
  createOpenApiDocument,
  writeOpenApiDocument,
} from '#app/platform/http/index.js'

const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false })

// global prefix をパスに反映させるため、本番と同じ設定を通す
setupApp(app)
await writeOpenApiDocument(createOpenApiDocument(app))
await app.close()
// eslint-disable-next-line no-console
console.log('openapi.json を生成しました')
