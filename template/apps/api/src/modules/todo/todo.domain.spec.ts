import {
  err,
  ok,
} from 'neverthrow'

import { Todo } from '#app/modules/todo/todo.domain.js'

const createdAt = new Date('2030-01-15T10:00:00.000Z')
const now = new Date('2030-01-16T09:00:00.000Z')

describe('Todo.create', () => {
  it('新しいtodoは、その時刻に作られた未完了のtodoになる', () => {
    const todo = Todo.create({ title: '牛乳を買う' }, now)

    expect({
      completedAt: todo.completedAt,
      createdAt: todo.createdAt,
      id: todo.id,
      status: todo.status,
      title: todo.title,
    }).toEqual({
      completedAt: null,
      createdAt: now,
      id: todo.id,
      status: 'incomplete',
      title: '牛乳を買う',
    })
  })
})

describe('Todo.from', () => {
  it('完了日時がない値は、未完了のtodoになる', () => {
    const todo = Todo.from({
      completedAt: null,
      createdAt,
      id: 'todo-1',
      title: '牛乳を買う',
    })

    expect({
      completedAt: todo.completedAt,
      createdAt: todo.createdAt,
      id: todo.id,
      status: todo.status,
      title: todo.title,
    }).toEqual({
      completedAt: null,
      createdAt,
      id: 'todo-1',
      status: 'incomplete',
      title: '牛乳を買う',
    })
  })

  it('完了日時がある値は、完了済みのtodoになる', () => {
    const todo = Todo.from({
      completedAt: now,
      createdAt,
      id: 'todo-1',
      title: '牛乳を買う',
    })

    expect({
      completedAt: todo.completedAt,
      createdAt: todo.createdAt,
      id: todo.id,
      status: todo.status,
      title: todo.title,
    }).toEqual({
      completedAt: now,
      createdAt,
      id: 'todo-1',
      status: 'completed',
      title: '牛乳を買う',
    })
  })
})

describe('Todo#complete', () => {
  it('未完了のtodoは、その時刻で完了になる', () => {
    const openTodo = Todo.from({
      completedAt: null,
      createdAt,
      id: 'todo-1',
      title: '牛乳を買う',
    })

    expect(openTodo.complete(now)).toEqual(ok(Todo.from({
      completedAt: now,
      createdAt,
      id: 'todo-1',
      title: '牛乳を買う',
    })))
  })

  it('すでに完了しているtodoは完了にできない', () => {
    const doneTodo = Todo.from({
      completedAt: createdAt,
      createdAt,
      id: 'todo-1',
      title: '牛乳を買う',
    })

    expect(doneTodo.complete(now)).toEqual(err({ type: 'AlreadyCompleted' }))
  })
})
