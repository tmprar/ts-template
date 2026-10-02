
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { App } from 'supertest/types.js'

import {
  Test,
  TestingModule,
  type TestingModuleBuilder,
} from '@nestjs/testing'
import assert from 'node:assert'

import { AppModule } from '#app/app.module.js'
import { setupApp } from '#app/app.setup.js'
import { JobQueueService } from '#app/platform/job/index.js'
import { MailService } from '#app/platform/mail/index.js'
import {
  createJobQueueMock,
  createMailServiceMock,
  type TestMocks,
} from '#test/support/app/mocks.js'

export type CreateTestAppOptions = {
  /**
  観点に固有の差し替え(障害の再現など)。標準のモックを当てたあとに呼ぶ
  */
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder
  /**
  ジョブキューの扱い。'stub'はpg-bossを起動せず投入の有無だけを記録し、
  'real'は実際にワーカーを動かして非同期処理の完了まで検証する
  */
  jobQueue?: 'real' | 'stub'
}

export type TestApp = {
  readonly app: NestExpressApplication
  readonly mocks: TestMocks
  server(): App
}

type StartedApp = {
  app: NestExpressApplication
  mocks: TestMocks
}

/**
外部サービス(メールの送信API)のHTTP境界だけを差し替えたアプリを起動する。
それ以外は本番と同じ構成で動かす。gatewayを足したら、ここでモックに差し替える
*/
export async function createTestApp(
  options: CreateTestAppOptions = {},
): Promise<StartedApp> {
  const mocks: TestMocks = {
    jobQueue: createJobQueueMock(),
    mail: createMailServiceMock(),
  }
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mocks.mail)

  if (options.jobQueue !== 'real') {
    builder = builder
      .overrideProvider(JobQueueService)
      .useValue(mocks.jobQueue)
  }

  if (options.configure) {
    builder = options.configure(builder)
  }

  const moduleFixture: TestingModule = await builder.compile()
  const app = moduleFixture.createNestApplication<NestExpressApplication>()

  setupApp(app)
  await app.init()

  return {
    app,
    mocks,
  }
}

/**
テストごとにアプリを起動・終了するフックを登録し、現在のアプリへの
参照を返す。モックもテストごとに作り直されるためリセットは不要
*/
export function useTestApp(options: CreateTestAppOptions = {}): TestApp {
  let started: StartedApp | undefined

  function current(): StartedApp {
    return started ?? assert.fail('テストアプリが起動していません')
  }

  beforeEach(async () => {
    started = await createTestApp(options)
  })

  afterEach(async () => {
    await started?.app.close()
    started = undefined
  })

  return {
    get app() {
      return current().app
    },
    get mocks() {
      return current().mocks
    },
    server: () => current().app.getHttpServer(),
  }
}
