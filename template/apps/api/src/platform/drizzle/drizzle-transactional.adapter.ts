import type { TransactionalAdapter } from '@nestjs-cls/transactional'

import {
  type DrizzleOrmTransactionalAdapterOptions,
  TransactionalAdapterDrizzleOrm,
} from '@nestjs-cls/transactional-adapter-drizzle-orm'
import {
  Err,
  err,
} from 'neverthrow'

import type { DrizzleDb } from '#app/platform/drizzle/drizzle.module.js'

type DrizzleTransactionOptions = Parameters<DrizzleDb['transaction']>[1]

/**
 * トランザクションをロールバックさせるために投げる例外。トランザクションの中で返された Result の失敗を持つ
 */
class RollbackSignal extends Error {
  constructor(public readonly result: Err<unknown, unknown>) {
    super('Result の失敗を返したため、トランザクションをロールバックする')
  }
}

/**
 * Drizzle のトランザクションを、`@Transactional()` と `TransactionHost#withTransaction` に提供する。
 * 処理が Result の失敗を返したときも、例外を投げたときと同じくロールバックし、呼び出し元にはその失敗を返す
 *
 * 失敗を返す前に書き込んだ内容を commit しないよう、ライブラリの adapter を、戻り値で判定する形に包む。
 * ライブラリの adapter は例外でだけロールバックするため、usecase が書き込んだあとに Result の失敗を返すと、
 * 書き込みの途中の状態が commit される。
 * ライブラリの adapter を継承せずに委譲するのは、ライブラリの adapter が `optionsFactory` をメソッドではなく
 * コンストラクタで代入するプロパティとして持ち、継承では `super` から呼び出せないため
 */
export class DrizzleTransactionalAdapter
implements TransactionalAdapter<DrizzleDb, DrizzleDb, DrizzleTransactionOptions> {
  public readonly connectionToken: unknown

  public readonly defaultTxOptions?: Partial<DrizzleTransactionOptions>

  private readonly inner: TransactionalAdapterDrizzleOrm<DrizzleDb>

  constructor(options: DrizzleOrmTransactionalAdapterOptions<DrizzleDb>) {
    this.inner = new TransactionalAdapterDrizzleOrm(options)
    this.connectionToken = this.inner.connectionToken
    this.defaultTxOptions = this.inner.defaultTxOptions
  }

  /**
   * 渡された Drizzle のインスタンスで、トランザクションを開く処理を返す。
   * 開く処理は、中の処理が Result の失敗を返すとロールバックし、その失敗を返す
   */
  public optionsFactory = (drizzleInstance: DrizzleDb): ReturnType<TransactionalAdapterDrizzleOrm<DrizzleDb>['optionsFactory']> => {
    const base = this.inner.optionsFactory(drizzleInstance)

    return {
      ...base,
      wrapWithNestedTransaction: async (txOptions, fn, setClient, client) =>
        await rollbackOnErr(async (): Promise<unknown> =>
          await base.wrapWithNestedTransaction(txOptions, async () => throwIfErr(await fn()), setClient, client)),
      wrapWithTransaction: async (txOptions, fn, setClient) =>
        await rollbackOnErr(async (): Promise<unknown> =>
          await base.wrapWithTransaction(txOptions, async () => throwIfErr(await fn()), setClient)),
    }
  }
}

/**
 * トランザクションを開く処理を実行し、Result の失敗によるロールバックであれば、その失敗を戻り値として返す。
 * それ以外の例外は投げ直す
 */
const rollbackOnErr = async (run: () => Promise<unknown>): Promise<unknown> => {
  try {
    return await run()
  } catch (error) {
    if (error instanceof RollbackSignal) {
      return err(error.result.error)
    }

    throw error
  }
}

/**
 * トランザクションの中の処理の戻り値が Result の失敗であれば、ロールバックさせる例外を投げる。
 * それ以外の戻り値はそのまま返す
 */
const throwIfErr = (value: unknown): unknown => {
  if (value instanceof Err) {
    throw new RollbackSignal(value)
  }

  return value
}
