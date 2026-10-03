import type { OnModuleInit } from '@nestjs/common'

import { Injectable } from '@nestjs/common'

import type { JobRetryPolicy } from '#app/platform/job/index.js'

import {
  NOTIFY_COMPLETED_TODO_QUEUE,
  type NotifyCompletedTodoJobData,
} from '#app/modules/todo/job/notify-completed-todo.queue.js'
import { TodoUsecase } from '#app/modules/todo/todo.usecase.js'
import { JobQueueService } from '#app/platform/job/index.js'

/**
通知のリトライ方針。最大3回で打ち切り、最終失敗はログに残すだけにする。
完了そのものには影響させない
*/
const NOTIFY_COMPLETED_TODO_RETRY: JobRetryPolicy = {
  retryBackoff: true,
  retryDelay: 30,
  retryDelayMax: 300,
  retryLimit: 3,
}

/**
 * todoの完了の通知の実行。送信APIの応答を利用者に待たせず、
 * 失敗してもやり直せるよう非同期ジョブで実行する。
 *
 * 投入はjob/notify-completed-todo.queue.tsが担う(投入側がハンドラへ依存しないよう分離)
 */
@Injectable()
export class NotifyCompletedTodoWorker implements OnModuleInit {
  constructor(
    private readonly jobQueue: JobQueueService,
    private readonly usecase: TodoUsecase,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.jobQueue.register<NotifyCompletedTodoJobData>(
      NOTIFY_COMPLETED_TODO_QUEUE,
      NOTIFY_COMPLETED_TODO_RETRY,
      async (data) => { await this.perform(data.todoId) },
    )
  }

  /**
   * 完了を知らせる。
   * 失敗はthrowに戻してジョブのリトライに委ねる
   */
  private async perform(todoId: string): Promise<void> {
    const notified = await this.usecase.notifyCompletedTodo({ todoId })

    // Resultをthrowへ戻し、pg-bossのリトライに委ねる
    if (notified.isErr()) {
      throw new Error(
        `todoの完了を通知できませんでした: ${notified.error.type}`,
        { cause: notified.error.cause ?? notified.error },
      )
    }
  }
}
