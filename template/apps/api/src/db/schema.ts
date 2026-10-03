/**
 * Drizzleのテーブル定義を集約するファイル。
 * テーブルを追加したらここからexportする(drizzle-kitとクライアントの両方が参照する)。
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}

/**
todo(todoモジュール所有)
*/
export const todos = pgTable('todos', {
  /**
  完了した日時。状態はカラムに持たず、この値から導出する
  */
  completedAt: timestamp('completed_at', { withTimezone: true }),
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  ...timestamps,
})
