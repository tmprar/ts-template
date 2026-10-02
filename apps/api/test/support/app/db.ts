import type { TestApp } from '#test/support/app/create-app.js'

import {
  DRIZZLE,
  type DrizzleDb,
} from '#app/platform/drizzle/index.js'

/**
APIでは作れない前提を用意するためのDB接続。検証のためにテーブルを読むのには使わない
*/
export function resolveDb(ctx: TestApp): DrizzleDb {
  return ctx.app.get<DrizzleDb>(DRIZZLE)
}
