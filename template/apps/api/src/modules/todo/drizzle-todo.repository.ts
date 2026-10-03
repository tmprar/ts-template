import { TransactionHost } from '@nestjs-cls/transactional'
import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import type { DrizzleAdapter } from '#app/platform/drizzle/index.js'

import { todos } from '#app/db/schema.js'
import {
  Todo,
  type TodoRepository,
} from '#app/modules/todo/todo.domain.js'

/**
 * todo(todos)の永続化。DBから受け取った値はEntityにして返す
 */
@Injectable()
export class DrizzleTodoRepository implements TodoRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleAdapter>) {}

  /**
   * todoを追加する
   */
  public async addTodo(todo: Todo): Promise<void> {
    await this.txHost.tx.insert(todos).values({
      completedAt: todo.completedAt,
      createdAt: todo.createdAt,
      id: todo.id,
      title: todo.title,
      updatedAt: todo.createdAt,
    })
  }

  /**
   * todoを削除する
   */
  public async deleteTodo(todo: Todo): Promise<void> {
    await this.txHost.tx.delete(todos).where(eq(todos.id, todo.id))
  }

  public async findTodo(todoId: string): Promise<Todo | undefined> {
    const [row] = await this.txHost.tx
      .select()
      .from(todos)
      .where(eq(todos.id, todoId))

    return row === undefined ? undefined : Todo.from(row)
  }

  /**
   * todoを更新する
   */
  public async updateTodo(todo: Todo): Promise<void> {
    await this.txHost.tx
      .update(todos)
      .set({
        completedAt: todo.completedAt,
        title: todo.title,
        updatedAt: new Date(),
      })
      .where(eq(todos.id, todo.id))
  }
}
