import type { NestExpressApplication } from '@nestjs/platform-express'
import type { App } from 'supertest/types.js'

import {
  Test,
  type TestingModuleBuilder,
} from '@nestjs/testing'
import assert from 'node:assert'

import type { JobRetryPolicy } from '#app/platform/job/index.js'

import { AppModule } from '#app/app.module.js'
import { setupApp } from '#app/app.setup.js'
import {
  DRIZZLE,
  type DrizzleDb,
} from '#app/platform/drizzle/index.js'
import { JobQueueService } from '#app/platform/job/index.js'

export type TestApp = {
  readonly app: NestExpressApplication
  readonly db: DrizzleDb
  /**
   * `jobQueue` が 'inline' のときのジョブキュー。'real' のときに読むとテストを失敗させる
   */
  readonly jobs: InlineJobQueue
  /**
   * 起動しているアプリの、supertest に渡す HTTP サーバを返す
   */
  server(): App
}

type Job = {
  data: object
  queue: string
}

type JobHandler = (data: object) => Promise<void>

type StartedApp = {
  app: NestExpressApplication
  jobs: InlineJobQueue | undefined
}

/**
 * 投入されたジョブを溜めておき、`drain` が呼ばれたときにその場で処理するジョブキュー。
 * pg-boss のポーリングを待たずに、応答を受け取った直後にジョブの結果を確かめられるよう、JobQueueService の代わりに使う。
 * リトライとデッドレターは再現しない。失敗したジョブは記録するだけで、もう一度処理するときはテストが投入し直す
 */
export class InlineJobQueue {
  public readonly failures: {
    error: unknown
    job: Job
  }[] = []

  private readonly handlers = new Map<string, JobHandler>()
  private readonly pending: Job[] = []

  /**
   * 溜まっているジョブと失敗の記録を消す
   */
  public clear(): void {
    this.pending.length = 0
    this.failures.length = 0
  }

  /**
   * 溜まっているジョブを、処理の中で投入されたジョブも含めて、溜まらなくなるまで投入した順に処理する
   */
  public async drain(): Promise<void> {
    for (let job = this.pending.shift(); job !== undefined; job = this.pending.shift()) {
      const handler = this.handlers.get(job.queue)
        ?? assert.fail(`ジョブの処理が登録されていません: ${job.queue}`)

      try {
        await handler(job.data)
      } catch (error) {
        this.failures.push({
          error,
          job,
        })
      }
    }
  }

  /**
   * queue へジョブを溜める
   */
  public async enqueue(queue: string, data: object): Promise<void> {
    this.pending.push({
      data,
      queue,
    })

    await Promise.resolve()
  }

  /**
   * queue のジョブの処理を登録する
   */
  public async register<T extends object>(
    queue: string,
    _retryPolicy: JobRetryPolicy,
    handler: (data: T) => Promise<void>,
  ): Promise<void> {
    this.handlers.set(queue, handler as JobHandler)

    await Promise.resolve()
  }
}

/**
 * 起動しているアプリ。factory がモジュールの外から読めるよう、モジュールの変数に置く
 */
const running: { current?: StartedApp } = {}

/**
 * 起動しているアプリを返す。アプリが起動していなければテストを失敗させる。
 * factory が引数に TestApp を取らずに DB へ書き込めるよう、モジュールの変数から読む
 */
export function currentApp(): NestExpressApplication {
  return (running.current ?? assert.fail('テストアプリが起動していません')).app
}

/**
 * 起動しているアプリの DB 接続を返す。アプリが起動していなければテストを失敗させる
 */
export function currentDb(): DrizzleDb {
  return currentApp().get<DrizzleDb>(DRIZZLE)
}

/**
 * ファイルの最初にアプリを起動して最後に終了する beforeAll と afterAll を登録し、起動したアプリを参照する TestApp を返す。
 * 外部サービスは MSW が HTTP の層で受ける。DI で差し替えるのはジョブキューだけにする。`jobQueue` が 'real' のときは pg-boss をそのまま動かす。
 * SDK を通すなどで HTTP の層では受けられない外部サービスを足したら、その gateway もここで差し替える。
 * アプリをテストごとに起動し直さないのは、起動に時間がかかるため。テストごとの状態(DB の行、MSW の応答)は setupFiles が消す
 */
export function useTestApp(options: {
  /**
   * ジョブキューを差し替えたあとのビルダーを受け取り、障害を起こすためにプロバイダを差し替えたビルダーを返す
   */
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder
  jobQueue?: 'inline' | 'real'
} = {}): TestApp {
  beforeAll(async () => {
    const jobs = options.jobQueue === 'real' ? undefined : new InlineJobQueue()
    let builder = Test.createTestingModule({ imports: [AppModule] })

    if (jobs) {
      builder = builder.overrideProvider(JobQueueService).useValue(jobs)
    }

    if (options.configure) {
      builder = options.configure(builder)
    }

    const app = (await builder.compile()).createNestApplication<NestExpressApplication>()

    setupApp(app)
    await app.init()
    running.current = {
      app,
      jobs,
    }
  })

  beforeEach(() => {
    running.current?.jobs?.clear()
  })

  afterAll(async () => {
    await running.current?.app.close()
    delete running.current
  })

  /**
   * 起動しているアプリを返す。beforeAll の前と afterAll の後に呼ぶと、テストを失敗させる
   */
  function started(): StartedApp {
    return running.current ?? assert.fail('テストアプリが起動していません')
  }

  return {
    get app() {
      return started().app
    },
    get db() {
      return currentDb()
    },
    get jobs() {
      return started().jobs ?? assert.fail('jobQueue が real のときはジョブを溜めません')
    },
    server: () => started().app.getHttpServer(),
  }
}
