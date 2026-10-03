import type { Mock } from 'vitest'

import { ok } from 'neverthrow'

export type JobQueueMock = {
  enqueue: Mock
  register: Mock
}

export type MailServiceMock = {
  send: Mock
}

/**
外部との境界を差し替えたもの。外部サービスとの境界(gatewayや送信基盤)を足したら、
そのモックをここに並べて create-app.ts で overrideProvider する
*/
export type TestMocks = {
  jobQueue: JobQueueMock
  mail: MailServiceMock
}

// ジョブキュー(pg-boss)を起動せずに済ませる。投入の有無だけを見たいとき用
export function createJobQueueMock(): JobQueueMock {
  return {
    enqueue: vi.fn(),
    register: vi.fn(),
  }
}

/**
メール送信のHTTP境界を差し替え、テストから実際に送信されないようにする。
既定は成功。失敗の注入は送信APIの応答ではなく送信基盤のエラー(SendMailError)で行う
*/
export function createMailServiceMock(): MailServiceMock {
  return {
    send: vi.fn().mockResolvedValue(ok(undefined)),
  }
}
