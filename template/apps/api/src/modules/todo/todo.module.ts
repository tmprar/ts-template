import { Module } from '@nestjs/common'

import { DrizzleTodoRepository } from '#app/modules/todo/drizzle-todo.repository.js'
import { NotifyCompletedTodoQueue } from '#app/modules/todo/job/notify-completed-todo.queue.js'
import { NotifyCompletedTodoWorker } from '#app/modules/todo/job/notify-completed-todo.worker.js'
import { TodoController } from '#app/modules/todo/todo.controller.js'
import { TODO_REPOSITORY } from '#app/modules/todo/todo.domain.js'
import { TodoQuery } from '#app/modules/todo/todo.query.js'
import { TodoUsecase } from '#app/modules/todo/todo.usecase.js'
import { AppConfigModule } from '#app/platform/config/index.js'
import { JobModule } from '#app/platform/job/index.js'
import { MailModule } from '#app/platform/mail/index.js'

/**
 * todoモジュール(構成を示すためのサンプル)。todosを所有し、
 * todoの追加・完了・削除と、完了のメールでの通知(非同期ジョブ)を担う
 */
@Module({
  controllers: [TodoController],
  imports: [AppConfigModule, JobModule, MailModule],
  providers: [
    NotifyCompletedTodoQueue,
    NotifyCompletedTodoWorker,
    TodoQuery,
    TodoUsecase,
    {
      provide: TODO_REPOSITORY,
      useClass: DrizzleTodoRepository,
    },
  ],
})
export class TodoModule {}
