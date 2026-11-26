// openapi.json を生成するスクリプト。
// @nestjs/swagger CLIプラグイン(introspectComments)の変換はnest build時にしか適用されないため、
// このスクリプトはTypeScriptのソースのまま実行せず、nest buildが .out/server/ に出力したJavaScriptを実行する
import type { NestExpressApplication } from '@nestjs/platform-express'

import { NestFactory } from '@nestjs/core'

/*
  OpenAPI の生成はアプリを起動して文書を書き出すだけで、DB にも外部サービスにも接続しない。
  CI が .env を注入せずに生成を実行しても起動時の検証が通るよう、設定されていない必須の環境変数に、生成では使われない仮の値を置く。
  AppModule は import した時点で環境変数を検証するので、値を置いてから動的に import する
*/
const placeholders = {
  DATABASE_URL: 'postgresql://openapi@localhost/openapi',
  NODE_ENV: 'development',
  WEB_APP_ORIGIN: 'http://localhost/openapi',
}

for (const [name, value] of Object.entries(placeholders)) {
  process.env[name] ??= value
}

const { AppModule } = await import('#app/app.module.js')
const { setupApp } = await import('#app/app.setup.js')
const {
  createOpenApiDocument,
  writeOpenApiDocument,
} = await import('#app/platform/http/index.js')

// eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment -- Nest がオプションの型を interface でなく class で宣言しているため
const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false })

// global prefix をパスに反映させるため、本番と同じ設定を通す
setupApp(app)
await writeOpenApiDocument(createOpenApiDocument(app))
await app.close()
// eslint-disable-next-line no-console
console.log('openapi.json を生成しました')
