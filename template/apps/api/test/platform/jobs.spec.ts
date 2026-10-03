import { TransactionHost } from '@nestjs-cls/transactional'
import { sql } from 'drizzle-orm'

import type { DrizzleAdapter } from '#app/platform/drizzle/index.js'

import { NOTIFY_COMPLETED_TODO_QUEUE } from '#app/modules/todo/job/notify-completed-todo.queue.js'
import { JobQueueService } from '#app/platform/job/index.js'
import { useTestApp } from '#test/support/app/create-app.js'
import { resolveDb } from '#test/support/app/db.js'

/*
  ジョブの投入は運用の契約で、利用者の振る舞いには現れない。
  「投入されていないこと」はAPIからも外部への要求からも観測できないため、
  ここだけpgbossのテーブルを直接見る(不在そのものが要件であるものに当たる)
*/
describe('ジョブキューの投入', () => {
  const ctx = useTestApp({ jobQueue: 'real' })

  // pgbossスキーマはテスト間のTRUNCATE対象外(publicのみ)のため、データで特定する
  const ROLLED_BACK_JOB = '00000000-0000-0000-0000-0000000000ff'
  const COMMITTED_JOB = '00000000-0000-0000-0000-0000000000ee'

  async function findJob(todoId: string): Promise<undefined | { id: string }> {
    const result = await resolveDb(ctx).execute<{ id: string }>(
      sql`SELECT id FROM pgboss.job WHERE data->>'todoId' = ${todoId}`,
    )

    return result.rows[0]
  }

  /**
  ジョブを投入したトランザクションをコミットする。
  afterEnqueueがthrowすればロールバックされる
  */
  async function enqueueIn(
    todoId: string,
    afterEnqueue?: () => void,
  ): Promise<void> {
    const txHost = ctx.app.get<TransactionHost<DrizzleAdapter>>(TransactionHost)
    const jobQueue = ctx.app.get(JobQueueService)

    await txHost.withTransaction(async () => {
      await jobQueue.enqueue(NOTIFY_COMPLETED_TODO_QUEUE, { todoId })
      afterEnqueue?.()
    })
  }

  describe('投入したトランザクションがロールバックしたとき', () => {
    it('ジョブは残らない', async () => {
      await expect(
        enqueueIn(ROLLED_BACK_JOB, () => {
          throw new Error('業務の処理が失敗した想定')
        }),
      ).rejects.toThrow('業務の処理が失敗した想定')

      expect(await findJob(ROLLED_BACK_JOB)).toBeUndefined()
    })
  })

  describe('投入したトランザクションがコミットされたとき', () => {
    it('ジョブが残る', async () => {
      await enqueueIn(COMMITTED_JOB)

      expect(await findJob(COMMITTED_JOB)).toBeDefined()
    })
  })
})
