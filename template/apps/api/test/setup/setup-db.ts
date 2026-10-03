import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import assert from 'node:assert'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import {
  afterAll,
  beforeEach,
} from 'vitest'

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
)

// narrowingを関数内(databaseUrl)まで効かせるため、||で受けてstringに確定させる
const BASE_URL
  = process.env['TEST_DATABASE_BASE_URL']
    || assert.fail(
      'TEST_DATABASE_BASE_URLが未設定です。global-setup.ts経由で実行してください',
    )

function databaseUrl(database: string): string {
  const url = new URL(BASE_URL)

  url.pathname = `/${database}`

  return url.href
}

// worker専用の空DBを作り直す。FORCE指定で残存接続があっても切断してDROPする
async function resetDb(name: string): Promise<void> {
  const admin = new pg.Client({ connectionString: databaseUrl('postgres') })

  await admin.connect()

  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await admin.query(`CREATE DATABASE "${name}"`)
  } finally {
    await admin.end()
  }
}

const workerDb = `test_worker_${process.env['VITEST_POOL_ID'] ?? '0'}`

process.env['DATABASE_URL'] = databaseUrl(workerDb)
// todoの完了を知らせる宛先(サンプル)。値は test/support/mails.ts の NOTICE_MAIL_TO と揃える
process.env['TODO_NOTICE_MAIL_TO'] = 'todo-owner@example.com'

await resetDb(workerDb)

const client = new pg.Client({ connectionString: databaseUrl(workerDb) })

await client.connect()
await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER })

// 各テストをまっさらなDBで開始する。drizzleのマイグレーション管理テーブルは
// publicではなくdrizzleスキーマにあるため対象外
beforeEach(async () => {
  const result = await client.query<{ tablename: string }>(
    'SELECT tablename FROM pg_tables WHERE schemaname = \'public\'',
  )

  if (result.rows.length === 0) {
    return
  }

  const tables = result.rows
    .map(row => `"public"."${row.tablename}"`)
    .join(', ')

  await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
})

afterAll(async () => {
  await client.end()
})
