import type { Result } from 'neverthrow'

import { Transactional } from '@nestjs-cls/transactional'
import {
  Inject,
  Injectable,
} from '@nestjs/common'
import {
  err,
  ok,
} from 'neverthrow'

import { NotifyCompletedTodoQueue } from '#app/modules/todo/job/notify-completed-todo.queue.js'
import {
  Todo,
  TODO_GATEWAY,
  TODO_REPOSITORY,
  type TodoGateway,
  type TodoRepository,
  type TodoStatus,
} from '#app/modules/todo/todo.domain.js'
import { TodoQuery } from '#app/modules/todo/todo.query.js'

/**
todoを完了にできなかった理由
*/
export type CompleteTodoError
  = | {
    todoId: string
    type: 'AlreadyCompleted'
  }
  | {
    todoId: string
    type: 'TodoNotFound'
  }

/**
todoを削除できなかった理由
*/
export type DeleteTodoError = {
  todoId: string
  type: 'TodoNotFound'
}

/**
todoの完了を知らせられなかった理由。`cause` は翻訳前の原因で、ログに出すためだけに運ぶ
*/
export type NotifyCompletedTodoError = {
  cause?: unknown
  type: 'NoticeUnavailable'
}

/**
todo
*/
export type TodoDto = {
  completedAt: Date | null
  createdAt: Date
  id: string
  status: TodoStatus
  title: string
}

/**
 * todoの追加・一覧・完了・削除と、完了の通知
 */
@Injectable()
export class TodoUsecase {
  constructor(
    @Inject(TODO_REPOSITORY) private readonly repository: TodoRepository,
    @Inject(TODO_GATEWAY) private readonly gateway: TodoGateway,
    private readonly query: TodoQuery,
    private readonly notifyCompletedTodoQueue: NotifyCompletedTodoQueue,
  ) {}

  /**
   * todoを完了にする。完了にしてよいかの判定はEntityが持つ。
   *
   * 完了の保存と通知の予約は同じトランザクションで行う
   * (完了したのに通知が予約されていない、という状態を作らないため)
   */
  @Transactional()
  public async completeTodo(
    input: { todoId: string },
  ): Promise<Result<TodoDto, CompleteTodoError>> {
    const todo = await this.repository.findTodo(input.todoId)

    if (!todo) {
      return err({
        todoId: input.todoId,
        type: 'TodoNotFound',
      })
    }

    const completed = todo.complete(new Date())

    if (completed.isErr()) {
      return err({
        todoId: input.todoId,
        type: completed.error.type,
      })
    }

    await this.repository.updateTodo(completed.value)
    await this.notifyCompletedTodoQueue.enqueue(completed.value.id)

    return ok({
      completedAt: completed.value.completedAt,
      createdAt: completed.value.createdAt,
      id: completed.value.id,
      status: completed.value.status,
      title: completed.value.title,
    })
  }

  /**
   * todoを追加する
   */
  public async createTodo(input: { title: string }): Promise<TodoDto> {
    const todo = Todo.create({ title: input.title }, new Date())

    await this.repository.addTodo(todo)

    return {
      completedAt: todo.completedAt,
      createdAt: todo.createdAt,
      id: todo.id,
      status: todo.status,
      title: todo.title,
    }
  }

  /**
   * todoを削除する
   */
  public async deleteTodo(
    input: { todoId: string },
  ): Promise<Result<undefined, DeleteTodoError>> {
    const todo = await this.repository.findTodo(input.todoId)

    if (!todo) {
      return err({
        todoId: input.todoId,
        type: 'TodoNotFound',
      })
    }

    await this.repository.deleteTodo(todo)

    return ok(undefined)
  }

  /**
   * todoを追加した順で返す
   */
  public async findTodos(): Promise<TodoDto[]> {
    const todos = await this.query.findTodos()

    return todos.map(todo => ({
      completedAt: todo.completedAt,
      createdAt: todo.createdAt,
      id: todo.id,
      status: todo.status,
      title: todo.title,
    }))
  }

  /**
   * todoの完了を知らせる(ジョブから呼ばれる)。
   *
   * 通知までにtodoが削除されたときは、何もせず成功として終える。
   * リトライで同じ通知が2回届くことはありうる(重複を許せないなら、
   * 送った日時を保存して送る前に確かめる)。
   *
   * 失敗はここでは記録しない。扱い(リトライに委ねる)を決めるのは呼び出し側のworkerで、
   * 記録はジョブキューが1回だけ行う
   */
  public async notifyCompletedTodo(
    input: { todoId: string },
  ): Promise<Result<undefined, NotifyCompletedTodoError>> {
    const todo = await this.repository.findTodo(input.todoId)

    if (!todo) {
      return ok(undefined)
    }

    return await this.gateway.notifyCompletedTodo(todo)
  }
}
