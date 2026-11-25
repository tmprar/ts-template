/**
 * テストでアプリに渡す環境変数。NODE_ENV は vitest が test に設定する
 */
export const TEST_ENV = {
  // 単体では接続しない。結合では、ワーカーごとのデータベースを作る setupFiles がこの値を置き換える
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/myapp_test',
  // メールの送信の設定を置き、送信の要求が MSW に届くようにする。設定が無いと、アプリは送信の要求を出さずに送信を省く
  MAIL_FROM: 'myapp <noreply@example.com>',
  RESEND_API_KEY: 'test-resend-api-key',
  // todo の完了を知らせる宛先(サンプル)
  TODO_NOTICE_MAIL_TO: 'todo-owner@example.com',
  // NODE_ENV は vitest が test に設定するので置かない
  WEB_APP_ORIGIN: 'http://localhost:5173',
}
