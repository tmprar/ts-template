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
 * ジョブを投入してから実行するまでの遅延を抑えるため、ポーリングの間隔は最短にする
 */
const POLLING_INTERVAL_SECONDS = 0.5

/**
 * 値は JobQueueService では決めない。仕事を所有するモジュールが、許容できる遅延に応じて決める
 */
export type JobRetryPolicy = {
  retryBackoff: boolean
  retryDelay: number
  retryDelayMax: number
  retryLimit: number
}

/**
 * ジョブの投入・ワーカーの登録・pg-boss の開始と停止を行う。
 * ジョブのハンドラはこのクラスに置かない。このクラスはジョブの内容に依存せず、
 * ハンドラは、その仕事を所有するモジュールが登録する
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
   * `queue` のキューへ `data` を持つジョブを 1 件投入し、トランザクションの中から呼んだ場合はジョブのINSERTをそのトランザクションに含め、
   * 外から呼んだ場合はルート接続での単独のINSERTにする。pg-boss が未開始のときは例外を投げる。
   * pg-boss自身のプールではなく現在の接続でINSERTする。pg-boss自身のプールでINSERTすると、ジョブが業務データと
   * 別のトランザクションになり、ロールバックしたときに、対応する業務データが存在しないジョブが残るため
   */
  public async enqueue(queue: string, data: object): Promise<void> {
    await this.requireBoss().send(queue, data, {
      db: fromDrizzle(this.txHost.tx, sql),
    })
  }

  /**
   * プロセスの終了時(SIGTERM など)に Nest から呼ばれ、ジョブワーカー(pg-boss)を停止する
   */
  public async onApplicationShutdown(): Promise<void> {
    await this.boss?.stop()
  }

  /**
   * アプリの起動時に Nest から呼ばれ、pg-boss を開始して enqueue と register を呼べる状態にし、以後に pg-boss 内部で起きたエラーをログに記録して Sentry へ送る
   */
  public async onModuleInit(): Promise<void> {
    const boss = new PgBoss(this.config.get('DATABASE_URL', { infer: true }))

    // pg-boss 内部(ポーリング・メンテナンス)のエラーは、この error イベントでしか受け取れない
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
   * `queue` のキューを `retryPolicy` 付きで作り、そのキューのジョブのデータを `handler` に渡して実行するワーカーを登録する。
   * deadLetter を指定すると、deadLetter のキューも作り、リトライの上限に達したジョブが移される先にする。pg-boss が未開始のときは例外を投げる。
   * pg-boss はこのクラスの onModuleInit で開始されるため、仕事を所有するモジュールは自分の onModuleInit から呼ぶ。
   * deadLetter のキューはこのメソッドでも作るため、元のキューと deadLetter のキューはどちらを先に登録してもよい
   */
  public async register<T extends object>(
    queue: string,
    retryPolicy: JobRetryPolicy,
    handler: (data: T) => Promise<void>,
    options?: { deadLetter: string },
  ): Promise<void> {
    const boss = this.requireBoss()

    // deadLetterを指定しないときは、deadLetterのキーをオプションに含めない。pg-bossはdeadLetterというキーがあるかどうか自体を検証するため
    if (options) {
      await boss.createQueue(options.deadLetter)
      await boss.createQueue(queue, {
        ...retryPolicy,
        deadLetter: options.deadLetter,
      })
    } else {
      await boss.createQueue(queue, retryPolicy)
    }

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

  /**
   * `queue` のキューへ、`cron`(UTC で解釈する cron 式)の時刻ごとに、データが空のジョブを投入するよう登録する。
   * 同じキューの登録は置き換わるので、起動のたびに呼んでよい。キューは先に register で作っておく。pg-boss が未開始のときは例外を投げる。
   * 停止やデプロイで投入の時刻を過ぎたときは、過ぎた回の数にかかわらず 1 件だけ投入させる。既定の skip では、投入の時刻に毎回デプロイが重なると、その仕事が一度も実行されないため
   */
  public async schedule(queue: string, cron: string): Promise<void> {
    await this.requireBoss().schedule(queue, cron, {}, {
      missed: 'once',
      tz: 'UTC',
    })
  }

  /**
   * 開始済みの pg-boss を返す。onModuleInit が完了する前に呼ぶと例外を投げる
   */
  private requireBoss(): PgBoss {
    const boss = this.boss

    if (!boss) {
      throw new Error('ジョブキューが初期化されていません')
    }

    return boss
  }

  /**
   * ジョブのデータを `handler` に渡して実行し、`handler` が例外を投げたときは、リトライが残っていれば warn で、
   * リトライの上限に達していれば error で記録して Sentry へ送り、同じ例外を投げ直す。
   * 投げ直すのは、pg-boss にリトライさせるため
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
