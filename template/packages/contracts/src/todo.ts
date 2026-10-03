import * as v from 'valibot'

const isoTimestamp = (description: string) =>
  v.pipe(v.string(), v.isoTimestamp(), v.description(description))

export const todoIdSchema = v.pipe(
  v.string(),
  v.uuid(),
  v.description('todoのID'),
)
export type TodoId = v.InferOutput<typeof todoIdSchema>

export const todoStatusSchema = v.pipe(
  v.picklist(['completed', 'incomplete']),
  v.description('todoの状態。incomplete は未完了、completed は完了済み'),
)
export type TodoStatus = v.InferOutput<typeof todoStatusSchema>

export const todoSchema = v.object({
  completedAt: v.nullable(isoTimestamp('完了した日時。未完了ならnull')),
  createdAt: isoTimestamp('追加した日時'),
  id: todoIdSchema,
  status: todoStatusSchema,
  title: v.pipe(v.string(), v.description('件名')),
})
export type Todo = v.InferOutput<typeof todoSchema>

/*
  レスポンスは必ずオブジェクトで包み、中身は名前の付いたプロパティに入れる。
  配列やリソースをそのまま返すと、ページ送りの情報や関連データを後から足すときに
  応答の形を変えることになり、互換性が壊れる
*/
export const todoResponseSchema = v.object({
  todo: todoSchema,
})
export type TodoResponse = v.InferOutput<typeof todoResponseSchema>

export const todoListResponseSchema = v.object({
  todos: v.pipe(
    v.array(todoSchema),
    v.description('todoの一覧。追加した順に並ぶ'),
  ),
})
export type TodoListResponse = v.InferOutput<typeof todoListResponseSchema>

/**
件名に指定できる文字数の上限
*/
export const TODO_TITLE_MAX_LENGTH = 100

/*
  webのフォームとAPIの入口が同じスキーマで入力を検証する(文言は画面にそのまま出る)。
  件名の制約を判定するのはここだけで、APIのcoreは検証済みの値として受け取る
*/
export const createTodoSchema = v.object({
  title: v.pipe(
    v.string('件名を入力してください'),
    v.trim(),
    v.minLength(1, '件名を入力してください'),
    v.maxLength(
      TODO_TITLE_MAX_LENGTH,
      `件名は${String(TODO_TITLE_MAX_LENGTH)}文字以内で入力してください`,
    ),
    v.description('件名。前後の空白は除く'),
  ),
})
export type CreateTodo = v.InferInput<typeof createTodoSchema>
export type CreateTodoInput = v.InferOutput<typeof createTodoSchema>
