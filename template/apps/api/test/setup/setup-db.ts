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

const BASE_URL
  = process.env['TEST_DATABASE_BASE_URL']
    || assert.fail(
      'TEST_DATABASE_BASE_URLが未設定です。global-setup.ts経由で実行してください',
    )

/**
 * コンテナの接続先の URL のうち、データベース名だけを database に差し替えた URL を返す
 */
function databaseUrl(database: string): string {
  const url = new URL(BASE_URL)

  url.pathname = `/${database}`

  return url.href
}

/**
 * name のデータベースがあれば削除し、同じ名前の空のデータベースを作る。
 * 前の実行の接続が残っていても削除できるよう、DROP に FORCE を付ける
 */
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

await resetDb(workerDb)

const client = new pg.Client({ connectionString: databaseUrl(workerDb) })

await client.connect()
await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER })

// マイグレーション管理テーブルを除外する条件は書かない。drizzleのマイグレーション管理テーブルはpublicではなくdrizzleスキーマにあるため、このTRUNCATEの対象にならない
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
