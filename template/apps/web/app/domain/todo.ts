/**
 * 画面が必要とするtodoの形。APIの生成型は使わず、ここで構造的に宣言する
 */
export type TodoItem = {
  id: string
  status: 'completed' | 'incomplete'
  title: string
}

/**
未完了と完了済みの件数
*/
export const countTodosByStatus = (todos: readonly TodoItem[]) => {
  const done = todos.filter(todo => todo.status === 'completed').length

  return {
    done,
    open: todos.length - done,
  }
}
