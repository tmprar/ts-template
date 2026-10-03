import type { Result } from 'neverthrow'

import {
  err,
  ok,
} from 'neverthrow'
import { randomUUID } from 'node:crypto'

/**
 * todoのドメイン。Entityと、Repository・Gatewayのinterfaceを定義する。
 * Nest・ORM・contracts・外部APIに依存しない
 */

/**
todoの完了の失敗
*/
export type CompleteTodoError = {
  type: 'AlreadyCompleted'
}

/**
todoの完了の通知の失敗。`cause` は翻訳前の原因で、ログに出すためだけに運ぶ
*/
export type NotifyCompletedTodoError = {
  cause?: unknown
  type: 'NoticeUnavailable'
}

/**
todoの状態
*/
export const TodoStatus = {
  Completed: 'completed',
  Incomplete: 'incomplete',
} as const
export type TodoStatus = (typeof TodoStatus)[keyof typeof TodoStatus]

/**
 * todoの状態を決める。状態は値として持たず、完了日時の有無から決める
 */
export const deriveTodoStatus = (completedAt: Date | null): TodoStatus =>
  completedAt === null ? TodoStatus.Incomplete : TodoStatus.Completed

/**
 * todo(Entity)。状態は値として持たず、完了日時の有無から決める
 */
export class Todo {
  public readonly completedAt: Date | null
  public readonly createdAt: Date
  public readonly id: string
  public readonly title: string

  public get status(): TodoStatus {
    return deriveTodoStatus(this.completedAt)
  }

  private constructor(props: {
    completedAt: Date | null
    createdAt: Date
    id: string
    title: string
  }) {
    this.completedAt = props.completedAt
    this.createdAt = props.createdAt
    this.id = props.id
    this.title = props.title
  }

  /**
   * 新しいtodoを作る。作った時点では未完了。
   * 件名の制約(前後の空白の除去・長さ)は境界のスキーマ(contracts)が検証している
   */
  public static create(input: { title: string }, now: Date): Todo {
    return new Todo({
      completedAt: null,
      createdAt: now,
      id: randomUUID(),
      title: input.title,
    })
  }

  /**
   * 保存済みの値からtodoを組み立て直す(判定はしない)
   */
  public static from(stored: {
    completedAt: Date | null
    createdAt: Date
    id: string
    title: string
  }): Todo {
    return new Todo(stored)
  }

  /**
   * todoを完了にする。すでに完了しているtodoは完了にできない
   * (最初に完了した日時を書き換えないため)
   */
  public complete(now: Date): Result<Todo, CompleteTodoError> {
    if (this.completedAt !== null) {
      return err({ type: 'AlreadyCompleted' })
    }

    return ok(new Todo({
      completedAt: now,
      createdAt: this.createdAt,
      id: this.id,
      title: this.title,
    }))
  }
}

export const TODO_REPOSITORY = Symbol('TodoRepository')

/**
 * todoの永続化
 */
export interface TodoRepository {
  addTodo(todo: Todo): Promise<void>
  deleteTodo(todo: Todo): Promise<void>
  findTodo(todoId: string): Promise<Todo | undefined>
  updateTodo(todo: Todo): Promise<void>
}

export const TODO_GATEWAY = Symbol('TodoGateway')

/**
 * todoについて外部へ出す連絡
 */
export interface TodoGateway {
  notifyCompletedTodo(todo: Todo): Promise<Result<undefined, NotifyCompletedTodoError>>
}
