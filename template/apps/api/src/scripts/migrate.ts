// 本番のデプロイ手順でDBマイグレーションを適用するスクリプト(docs/architecture.md)。
// drizzle-kitはdevDependencyでイメージに含めないため、drizzle-ormのmigratorで
// 同梱した drizzle/ のSQLを適用する。ビルド後の dist/scripts/migrate.js を実行する
import { NestFactory } from '@nestjs/core'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

import {
  AppConfigModule,
  AppConfigService,
} from '#app/platform/config/index.js'

// ビルド後はdist/scripts/migrate.jsになるため、2つ上がパッケージルート
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))

// 接続先はアプリと同じくconfig経由で読む(process.envは直接参照しない)
const context = await NestFactory.createApplicationContext(AppConfigModule, {
  logger: false,
})
const config = context.get(AppConfigService)
const client = new pg.Client({
  connectionString: config.get('DATABASE_URL', { infer: true }),
})

await client.connect()

try {
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER })
  // eslint-disable-next-line no-console
  console.log('マイグレーションを適用しました')
} finally {
  await client.end()
  await context.close()
}
