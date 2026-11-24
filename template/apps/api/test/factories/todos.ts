import { Factory } from 'fishery'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'

import { todos } from '#app/db/schema.js'
import { currentDb } from '#test/setup/app.js'

type Todo = typeof todos.$inferSelect

/**
 * todo を DB に作る factory。既定では未完了にする。完了済みにするときは `completedAt` を渡す。
 * API で作れる前提も、テストの対象の操作でなければ factory で作り、前提を作る手順をテストに書かない
 */
export const todoFactory = Factory.define<Todo>(({ onCreate, sequence }) => {
  onCreate(async (todo) => {
    const [row] = await currentDb().insert(todos).values(todo).returning()

    return row ?? assert.fail('todoを作れませんでした')
  })

  return {
    completedAt: null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)),
    id: randomUUID(),
    title: `todo ${String(sequence)}`,
    updatedAt: new Date(),
  }
})
