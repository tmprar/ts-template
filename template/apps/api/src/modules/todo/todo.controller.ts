import {
  type CreateTodoInput,
  createTodoSchema,
  todoIdSchema,
  type TodoListResponse,
  todoListResponseSchema,
  type TodoResponse,
  todoResponseSchema,
} from '@myapp/contracts'
import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'

import { TodoUsecase } from '#app/modules/todo/todo.usecase.js'
import {
  ApiErrorResponse,
  ApiResponse,
} from '#app/platform/http/index.js'

@Controller('todos')
export class TodoController {
  constructor(private readonly usecase: TodoUsecase) {}

  /**
   * todoを完了にする
   *
   * @remarks すでに完了しているtodoは409を返します。完了はメールで通知されます(送信は非同期で、応答は待ちません)。
   */
  @ApiErrorResponse(400, ['INVALID_REQUEST'])
  @ApiErrorResponse(409, ['TODO_ALREADY_COMPLETED'])
  @ApiErrorResponse(404, ['TODO_NOT_FOUND'])
  @ApiResponse(todoResponseSchema)
  // Nest は POST を既定で 201 にする。新しいものは作らないので 200 で返す
  @HttpCode(HttpStatus.OK)
  @Post(':id/complete')
  public async complete(
    @Param('id', { schema: todoIdSchema }) id: string,
  ): Promise<TodoResponse> {
    const completed = await this.usecase.completeTodo({ todoId: id })

    if (completed.isErr()) {
      throw completed.error.type === 'AlreadyCompleted'
        ? new ConflictException({
            code: 'TODO_ALREADY_COMPLETED',
            message: 'すでに完了しています',
          })
        : new NotFoundException({
            code: 'TODO_NOT_FOUND',
            message: 'todoが見つかりません',
          })
    }

    return {
      todo: {
        completedAt: completed.value.completedAt?.toISOString() ?? null,
        createdAt: completed.value.createdAt.toISOString(),
        id: completed.value.id,
        status: completed.value.status,
        title: completed.value.title,
      },
    }
  }

  /**
   * todoを追加
   *
   * @remarks 件名は前後の空白を除いて1〜100文字です。
   */
  @ApiErrorResponse(400, ['INVALID_REQUEST'])
  @ApiResponse(todoResponseSchema, 201)
  @Post()
  public async create(
    @Body({ schema: createTodoSchema }) body: CreateTodoInput,
  ): Promise<TodoResponse> {
    const created = await this.usecase.createTodo({ title: body.title })

    return {
      todo: {
        completedAt: created.completedAt?.toISOString() ?? null,
        createdAt: created.createdAt.toISOString(),
        id: created.id,
        status: created.status,
        title: created.title,
      },
    }
  }

  /**
   * todoの一覧を取得
   *
   * @remarks 追加した順に返します。
   */
  @ApiResponse(todoListResponseSchema)
  @Get()
  public async findMany(): Promise<TodoListResponse> {
    const todos = await this.usecase.findTodos()

    return {
      todos: todos.map(todo => ({
        completedAt: todo.completedAt?.toISOString() ?? null,
        createdAt: todo.createdAt.toISOString(),
        id: todo.id,
        status: todo.status,
        title: todo.title,
      })),
    }
  }

  /**
   * todoを削除
   */
  @ApiErrorResponse(400, ['INVALID_REQUEST'])
  @ApiErrorResponse(404, ['TODO_NOT_FOUND'])
  @ApiResponse()
  @Delete(':id')
  public async remove(
    @Param('id', { schema: todoIdSchema }) id: string,
  ): Promise<void> {
    const deleted = await this.usecase.deleteTodo({ todoId: id })

    if (deleted.isErr()) {
      throw new NotFoundException({
        code: 'TODO_NOT_FOUND',
        message: 'todoが見つかりません',
      })
    }
  }
}
