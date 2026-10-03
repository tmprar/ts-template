import { TransactionHost } from '@nestjs-cls/transactional'
import { Injectable } from '@nestjs/common'
import { asc } from 'drizzle-orm'

import type { DrizzleAdapter } from '#app/platform/drizzle/index.js'

import { todos } from '#app/db/schema.js'
import {
  deriveTodoStatus,
  type TodoStatus,
} from '#app/modules/todo/todo.domain.js'

/**
一覧に出すtodo
*/
export type TodoListItemDto = {
  completedAt: Date | null
  createdAt: Date
  id: string
  status: TodoStatus
  title: string
}

/**
 * todoの参照系。Entityには組み立てず、読む側が必要とする形(DTO)で返す
 */
@Injectable()
export class TodoQuery {
  constructor(private readonly txHost: TransactionHost<DrizzleAdapter>) {}

  /**
   * todoを追加した順で返す
   */
  public async findTodos(): Promise<TodoListItemDto[]> {
    const rows = await this.txHost.tx
      .select()
      .from(todos)
      .orderBy(asc(todos.createdAt))

    return rows.map(row => ({
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      id: row.id,
      status: deriveTodoStatus(row.completedAt),
      title: row.title,
    }))
  }
}
