import { Injectable } from '@nestjs/common'

import { JobQueueService } from '#app/platform/job/index.js'

export const NOTIFY_COMPLETED_TODO_QUEUE = 'notify_completed_todo'

export type NotifyCompletedTodoJobData = {
  todoId: string
}

/**
 * todoの完了の通知の投入口。完了にする側はこれだけを参照し、
 * 実行するハンドラ(worker)には依存しない
 */
@Injectable()
export class NotifyCompletedTodoQueue {
  constructor(private readonly jobQueue: JobQueueService) {}

  /**
   * 通知を予約する。完了を保存するトランザクションの中から呼ぶ
   */
  public async enqueue(todoId: string): Promise<void> {
    const data: NotifyCompletedTodoJobData = { todoId }

    await this.jobQueue.enqueue(NOTIFY_COMPLETED_TODO_QUEUE, data)
  }
}
