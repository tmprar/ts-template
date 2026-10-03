import {
  countTodosByStatus,
  type TodoItem,
} from '~/domain/todo'

const todo = (id: string, status: TodoItem['status']): TodoItem => ({
  id,
  status,
  title: '牛乳を買う',
})

describe('countTodosByStatus', () => {
  it('未完了と完了済みを数える', () => {
    expect(countTodosByStatus([
      todo('1', 'incomplete'),
      todo('2', 'completed'),
      todo('3', 'incomplete'),
    ])).toEqual({
      done: 1,
      open: 2,
    })
  })

  it('todoがなければどちらも0件', () => {
    expect(countTodosByStatus([])).toEqual({
      done: 0,
      open: 0,
    })
  })
})
