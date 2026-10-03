import type {
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common'

import { TransactionHost } from '@nestjs-cls/transactional'
import { Injectable } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import { sql } from 'drizzle-orm'
import { PinoLogger } from 'nestjs-pino'
import {
  fromDrizzle,
  type JobWithMetadata,
  PgBoss,
} from 'pg-boss'

import type { DrizzleAdapter } from '#app/platform/drizzle/index.js'

import { AppConfigService } from '#app/platform/config/index.js'

/**
投入直後の実行遅延を抑えるためポーリングは最短にする
*/
const POLLING_INTERVAL_SECONDS = 0.5

/**
ジョブのリトライ方針。仕事の持ち主が許容する遅延に応じて決める
*/
export type JobRetryPolicy = {
  retryBackoff: boolean
  retryDelay: number
  retryDelayMax: number
  retryLimit: number
}

/**
 * pg-bossによるジョブキュー基盤。投入・ワーカー登録・ライフサイクルのみを担い、
 * ジョブの中身は知らない。ハンドラはその仕事を所有するモジュールが登録する
 */
@Injectable()
export class JobQueueService implements OnApplicationShutdown, OnModuleInit {
  private boss: PgBoss | undefined

  constructor(
    private readonly config: AppConfigService,
    private readonly txHost: TransactionHost<DrizzleAdapter>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(JobQueueService.name)
  }

  /**
   * ジョブを投入する。呼び出し元のトランザクションに相乗りさせるため、
   * pg-boss自身のプールではなく現在の接続でINSERTする。
   * これにより業務データとジョブが同一トランザクションで原子的にコミットされ、
   * ロールバック時に幽霊ジョブが残らない。
   * トランザクション外から呼んだ場合はルート接続での単独INSERTになる
   */
  public async enqueue(queue: string, data: object): Promise<void> {
    await this.requireBoss().send(queue, data, {
      db: fromDrizzle(this.txHost.tx, sql),
    })
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.boss?.stop()
  }

  public async onModuleInit(): Promise<void> {
    const boss = new PgBoss(this.config.get('DATABASE_URL', { infer: true }))

    // pg-boss 内部(ポーリング・メンテナンス)のエラーはここにしか出ない
    boss.on('error', (error) => {
      this.logger.error({
        err: error,
        event: 'job_queue_error',
      }, 'ジョブキューでエラーが発生しました')
      Sentry.captureException(error)
    })
    await boss.start()
    this.boss = boss
  }

  /**
   * キューを作成し、ワーカーを登録する。
   * 呼び出し側(ジョブの持ち主)のonModuleInitから呼ぶ。
   * deadLetterを指定するとリトライ上限に達したジョブがそのキューへ移送される。
   * 移送先はここでも作成するため、両キューの登録順に依存しない
   */
  public async register<T extends object>(
    queue: string,
    retryPolicy: JobRetryPolicy,
    handler: (data: T) => Promise<void>,
    options?: { deadLetter: string },
  ): Promise<void> {
    const boss = this.requireBoss()

    // pg-bossはdeadLetterキー自体の有無を検証するため、条件付きで展開する
    if (options) {
      await boss.createQueue(options.deadLetter)
      await boss.createQueue(queue, {
        ...retryPolicy,
        deadLetter: options.deadLetter,
      })
    } else {
      await boss.createQueue(queue, retryPolicy)
    }

    // T を明示すると options の型推論(const O)が効かなくなるため、メタデータ付きの型も明示する
    await boss.work<T, unknown, {
      includeMetadata: true
      pollingIntervalSeconds: number
    }>(
      queue,
      {
        includeMetadata: true,
        pollingIntervalSeconds: POLLING_INTERVAL_SECONDS,
      },
      async (jobs) => {
        for (const job of jobs) {
          await this.run(job, handler)
        }
      },
    )
  }

  private requireBoss(): PgBoss {
    const boss = this.boss

    if (!boss) {
      throw new Error('ジョブキューが初期化されていません')
    }

    return boss
  }

  /**
   * ハンドラの失敗をログに残してからリトライに委ねる。リトライが尽きた(諦めた)ジョブは
   * error にし、監視のメトリクスフィルタで拾う。deadLetter があれば移送先の
   * ハンドラが後始末をする
   */
  private async run<T extends object>(
    job: JobWithMetadata<T>,
    handler: (data: T) => Promise<void>,
  ): Promise<void> {
    try {
      await handler(job.data)
    } catch (error) {
      const isAbandoned = job.retryCount >= job.retryLimit
      const fields = {
        err: error,
        event: isAbandoned ? 'job_abandoned' : 'job_failed',
        jobId: job.id,
        queue: job.name,
        retryCount: job.retryCount,
        retryLimit: job.retryLimit,
      }

      if (isAbandoned) {
        this.logger.error(fields, 'ジョブのリトライが尽きました')
        // 諦めたものだけ Sentry へ。リトライ中の失敗は送らない
        Sentry.captureException(error, {
          tags: {
            job_id: job.id,
            queue: job.name,
          },
        })
      } else {
        this.logger.warn(fields, 'ジョブが失敗しました。リトライします')
      }

      throw error
    }
  }
}
