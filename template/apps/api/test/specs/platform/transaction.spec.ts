import {
  Propagation,
  TransactionHost,
} from '@nestjs-cls/transactional'
import { eq } from 'drizzle-orm'
import {
  err,
  ok,
} from 'neverthrow'

import type { DrizzleAdapter } from '#app/platform/drizzle/index.js'

import { todos } from '#app/db/schema.js'
import { todoFactory } from '#test/factories/todos.js'
import { useTestApp } from '#test/setup/app.js'

/*
  このファイルは、APIの応答ではなくDBの行を直接読む。トランザクションがcommitしたかロールバックしたかは、
  Result の失敗を返したあとの書き込みの有無でしか見分けられず、どのエンドポイントの応答にも表れないため。
  ロールバックを確かめるときは、書き込んだ行がトランザクションの中で見えることを確かめてから失敗を返す。
  書き込みが起きなかった場合にも、行が無いという結果は同じになるため
*/
describe('トランザクションのcommitとロールバック', () => {
  const ctx = useTestApp()

  /**
   * TransactionHost を取り出す
   */
  function getTxHost(): TransactionHost<DrizzleAdapter> {
    return ctx.app.get<TransactionHost<DrizzleAdapter>>(TransactionHost)
  }

  /**
   * todo を、呼び出したトランザクションの中で追加する
   */
  async function addTodo(todo: typeof todos.$inferInsert): Promise<void> {
    await getTxHost().tx.insert(todos).values(todo)
  }

  /**
   * todoId の todo が見えるかを返す。トランザクションの中で呼ぶとそのトランザクションの書き込みを含めて読み、
   * 外で呼ぶと commit された行だけを読む
   */
  async function hasTodo(todoId: string): Promise<boolean> {
    const rows = await getTxHost().tx.select({ id: todos.id }).from(todos).where(eq(todos.id, todoId))

    return rows.length > 0
  }

  describe('中の処理が成功を返したとき', () => {
    it('書き込みをcommitし、成功をそのまま返す', async () => {
      const todo = todoFactory.build()

      const result = await getTxHost().withTransaction(async () => {
        await addTodo(todo)

        return ok('added')
      })

      expect(result).toEqual(ok('added'))
      expect(await hasTodo(todo.id)).toBe(true)
    })
  })

  describe('中の処理が Result の失敗を返したとき', () => {
    it('それまでの書き込みをすべてロールバックし、同じ失敗を返す', async () => {
      const first = todoFactory.build()
      const second = todoFactory.build()

      const result = await getTxHost().withTransaction(async () => {
        await addTodo(first)
        await addTodo(second)
        expect([await hasTodo(first.id), await hasTodo(second.id)]).toEqual([true, true])

        return err({ type: 'Failed' })
      })

      expect(result).toEqual(err({ type: 'Failed' }))
      expect([await hasTodo(first.id), await hasTodo(second.id)]).toEqual([false, false])
    })
  })

  describe('中の処理が例外を投げたとき', () => {
    it('書き込みをロールバックし、同じ例外を投げる', async () => {
      const todo = todoFactory.build()

      await expect(getTxHost().withTransaction(async () => {
        await addTodo(todo)
        expect(await hasTodo(todo.id)).toBe(true)

        throw new Error('想定外の失敗')
      })).rejects.toThrow('想定外の失敗')

      expect(await hasTodo(todo.id)).toBe(false)
    })
  })

  describe('外側のトランザクションに参加した内側の処理が失敗を返し、外側が成功を返したとき', () => {
    it('内側の書き込みもcommitする', async () => {
      const txHost = getTxHost()
      const todo = todoFactory.build()

      const result = await txHost.withTransaction(async () => {
        const inner = await txHost.withTransaction(async () => {
          await addTodo(todo)

          return err({ type: 'Failed' })
        })

        return ok(inner.isErr())
      })

      expect(result).toEqual(ok(true))
      expect(await hasTodo(todo.id)).toBe(true)
    })
  })

  describe('savepoint で入れ子にした内側の処理が失敗を返し、外側が成功を返したとき', () => {
    it('内側の書き込みだけをロールバックし、外側の書き込みはcommitする', async () => {
      const txHost = getTxHost()
      const outerTodo = todoFactory.build()
      const innerTodo = todoFactory.build()

      const result = await txHost.withTransaction(async () => {
        await addTodo(outerTodo)

        const inner = await txHost.withTransaction(Propagation.Nested, async () => {
          await addTodo(innerTodo)
          expect(await hasTodo(innerTodo.id)).toBe(true)

          return err({ type: 'Failed' })
        })

        return ok(inner)
      })

      expect(result).toEqual(ok(err({ type: 'Failed' })))
      expect(await hasTodo(outerTodo.id)).toBe(true)
      expect(await hasTodo(innerTodo.id)).toBe(false)
    })
  })
})
