import {
  type CreateTodoInput,
  createTodoSchema,
  todoIdSchema,
  todoListResponseSchema,
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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger'

import { TodoUsecase } from '#app/modules/todo/todo.usecase.js'
import { ApiResponse } from '#app/platform/http/index.js'

@Controller('todos')
export class TodoController {
  constructor(private readonly usecase: TodoUsecase) {}

  /**
   * todoを完了にする
   *
   * @remarks すでに完了しているtodoは409を返します。完了はメールで通知されます(送信は非同期で、応答は待ちません)。
   */
  @ApiConflictResponse()
  @ApiNotFoundResponse()
  @ApiResponse(todoResponseSchema)
  // Nest は POST を既定で 201 にする。新しいものは作らないので 200 で返す
  @HttpCode(HttpStatus.OK)
  @Post(':id/complete')
  public async complete(
    @Param('id', { schema: todoIdSchema }) id: string,
  ) {
    const completed = await this.usecase.completeTodo({ todoId: id })

    if (completed.isErr()) {
      // 状態による拒否は409
      throw completed.error.type === 'AlreadyCompleted'
        ? new ConflictException('すでに完了しています')
        : new NotFoundException('todoが見つかりません')
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
  @ApiBadRequestResponse()
  @ApiResponse(todoResponseSchema, 201)
  @Post()
  public async create(
    @Body({ schema: createTodoSchema }) body: CreateTodoInput,
  ) {
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
  public async findMany() {
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
  @ApiNotFoundResponse()
  @ApiResponse()
  @Delete(':id')
  public async remove(
    @Param('id', { schema: todoIdSchema }) id: string,
  ): Promise<void> {
    const deleted = await this.usecase.deleteTodo({ todoId: id })

    if (deleted.isErr()) {
      throw new NotFoundException('todoが見つかりません')
    }
  }
}
