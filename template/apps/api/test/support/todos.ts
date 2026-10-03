import type {
  Todo,
  TodoListResponse,
  TodoResponse,
} from '@myapp/contracts'

import request from 'supertest'

import type { TestApp } from '#test/support/app/create-app.js'

export function completeTodo(ctx: TestApp, todoId: string): request.Test {
  return request(ctx.server()).post(`/api/todos/${todoId}/complete`)
}

/**
完了済みのtodoを作る
*/
export async function createCompletedTodo(
  ctx: TestApp,
  title: string,
): Promise<Todo> {
  const todo = await createTodo(ctx, title)
  const response = await completeTodo(ctx, todo.id).expect(200)

  return (response.body as TodoResponse).todo
}

/**
未完了のtodoを作る
*/
export async function createTodo(ctx: TestApp, title: string): Promise<Todo> {
  const response = await request(ctx.server())
    .post('/api/todos')
    .send({ title })
    .expect(201)

  return (response.body as TodoResponse).todo
}

export function deleteTodo(ctx: TestApp, todoId: string): request.Test {
  return request(ctx.server()).delete(`/api/todos/${todoId}`)
}

/**
一覧に出るtodo
*/
export async function findTodos(ctx: TestApp): Promise<Todo[]> {
  const response = await request(ctx.server()).get('/api/todos').expect(200)

  return (response.body as TodoListResponse).todos
}
