// マイグレーションの適用にdrizzle-kitは使わず、drizzle-ormのmigratorでイメージに同梱した drizzle/ のSQLを適用する。
// drizzle-kitはdevDependencyで本番のイメージに含めないため。実行するのはビルド後の dist/scripts/migrate.js
import { NestFactory } from '@nestjs/core'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

import {
  AppConfigModule,
  AppConfigService,
} from '#app/platform/config/index.js'

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))

// eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment -- Nest がオプションの型を interface でなく class で宣言しているため
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
