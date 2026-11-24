# myapp

NestJS(API)+ Nuxt(web)のモノレポ。テンプレートから作った状態では、構成を示すサンプルとして `todo` モジュールと
その画面が 1 つ入っている(最初の機能を作るときに置き換える)。

pnpm workspace + Turborepo のモノレポ。

- `apps/api/`: NestJS API (`@myapp/api`)
- `apps/web/`: Nuxt フロントエンド (`@myapp/web`)
- `packages/contracts/`: API の入出力スキーマ (`@myapp/contracts`)
- `packages/typescript-config/`, `packages/eslint-config/`: 共有設定
- `apps/infra/`: AWS CDK (`@myapp/infra`)。テンプレートの時点では空のスタックだけ。デプロイ先はプロジェクトごとに決めて足す

## コマンド

ルートから turbo 経由で全パッケージに実行される。

```bash
pnpm install
pnpm dev        # DB コンテナ(compose.yml)を起動し、ルートの .env.local・.env を注入して api/web を起動
pnpm compose    # Docker Compose(.env.local・.env を復号して注入。例: pnpm compose ps)
pnpm build
pnpm lint       # ESLint(--fix 付き)
pnpm typecheck
pnpm test       # vitest(純関数の単体)
pnpm test:cov   # 単体と結合を合わせて実行し、カバレッジを合算する(CI はこちらを走らせ PR にコメントする)
pnpm test:mutation  # ミューテーションテスト(Stryker。api の domain と shared だけ。CI では毎週実行する)
pnpm test:integration  # 結合テスト(API は testcontainers の PostgreSQL、web は Nuxt 環境のコンポーネント)
pnpm depcruise  # 循環 import の検出
pnpm lint:text  # 日本語の文章の検査(textlint。検査しないファイルは .textlintignore)
pnpm db         # drizzle-kit(例: pnpm db generate / pnpm db migrate)
```

インフラは `pnpm --filter @myapp/infra cdk <deploy|diff|synth>`(deploy と diff には AWS 認証情報が必要)。

`--filter` で直接実行するとルートの `.env.local`・`.env` の注入も DB コンテナの起動も行われない。通常はルートのスクリプトを使う。

## 前提

- 開発環境はルート駆動。環境変数はルートの `.env.local`・`.env` を `dotenvx run` で注入し、パッケージ側から外を参照しない。`.env` は値を dotenvx で暗号化してコミットし、開発者ごとに異なる値は `.env.local`(コミットしない)に書く。復号の鍵 `.env.keys` はコミットしない
- API では `process.env` を直接読まない。`apps/api/src/platform/config/env.schema.ts` に追加し、`AppConfigService` 経由で参照する。例外は Nest より先に走る `src/instrument.ts`(Sentry)だけで、そこも同じスキーマで検証して読む
- `@nestjs/config` の `validationSchema` は Standard Schema 対応。valibot をそのまま渡している
- `apps/api` の import は `#app/*` / `#test/*` のサブパス(`package.json` の `imports`)。相対 import は ESLint で禁止している
- web の API クライアントは `apps/api` の OpenAPI から生成する(`app/generated/api/`)。手で書かない
- API の全ルートは `/api` 接頭辞付き(`app.setup.ts` の `API_PREFIX`)。本番は手前のプロキシが `/api/*` だけを API に流し、web と同一オリジンで配信する前提。開発の API リファレンスは `http://localhost:3000/api/docs`
- コミット時に lefthook が lint・typecheck・depcruise・textlint と commitlint(コミットメッセージ)を走らせる。push 時はブランチ名を検査する
- 認証はテンプレートに含めていない。足すときは、セッションの書き込みを `req.session` への代入、読み取りを valibot でのパースにし(共有の型ファイルは作らない)、
  全ルートの 401 を `test/platform/authentication.spec.ts` の表で一括して見る

## 規約

### API のモジュール構成

`apps/api/src/modules/<module>/` の中は次の構成にする(サンプルは `todo`)。

```
todo/
  todo.domain.ts
  todo.controller.ts
  todo.facade.ts
  todo.usecase.ts
  todo.query.ts
  drizzle-todo.repository.ts
  assets/
    completed-todo-mail.eta
  job/
    notify-completed-todo.queue.ts
    notify-completed-todo.worker.ts
  todo.module.ts
  index.ts
```

- Domain は、Repository・Gateway の interface と、Entity、値オブジェクト、ドメインサービスを定義する。
  Repository・Gateway の interface の定義では、Entity や値オブジェクトを I/F とする
- Controller の I/F は contracts で定義する。Usecase を呼ぶ。Usecase を呼び出すときと、レスポンスするときの整形は、
  Controller の内部でインラインに書く
- Facade の I/F は DTO。DTO は Facade 内に定義する。Usecase を呼ぶ。Usecase を呼び出すときと、戻り値を返すときの整形は、
  Facade の内部でインラインに書く
- Usecase の I/F は DTO。DTO は Usecase 内に定義する。Repository や Gateway、QueryService を呼ぶ。
  Repository を呼び出すときは、Entity の create メソッドを呼び出して Entity にして渡す。
  戻り値の DTO への整形は、Usecase の内部でインラインに書く。Repository と Gateway は interface で DI する。
  技術基盤(`platform/`)のサービスは interface を挟まずに直接呼ぶ(メールの送信は `MailService`)
- QueryService の I/F は DTO。DTO は QueryService 内に定義する
- Repository の I/F は Domain から interface を import して implements する。Entity は Domain に定義し、
  データベースから受け取った値を Entity の from メソッドを呼び出して、Entity にして返す
- Gateway の I/F は Domain から interface を import して implements する。外部サービスとやり取りする。
  サンプルの `todo` には無い(メールの送信は Gateway を作らず、Usecase が `MailService` を呼ぶ)
- メールの件名と本文は、Domain の build 関数で組み立てる(`buildCompletedTodoMail`)。本文は eta のテンプレートにして、
  モジュールの `assets/` に置く(`assets/completed-todo-mail.eta`)。Usecase は build 関数の戻り値を `MailService` に渡す
- Repository・Gateway の実装クラスは、interface の名前の前に実装の手段を付け(`DrizzleTodoRepository`・`SlackTodoGateway`)、
  ファイル名をクラス名に合わせる(`drizzle-todo.repository.ts`・`slack-todo.gateway.ts`)
- 同じ役割のファイルが 1 つのうちはモジュール直下に置き、複数になったら役割の名前のディレクトリにまとめる
  (`repository/drizzle-todo.repository.ts`・`repository/drizzle-todo-comment.repository.ts`)。
  controller・usecase・query・repository・gateway など、どの役割も同じ
- Worker は、Usecase を呼ぶ。エラーは throw する
- `Result` の失敗の型は、役割を問わずメソッドごとに定義する(`completeTodo` なら `CompleteTodoError`、`send` なら `SendMailError`)。
  そのメソッドで起こる失敗だけを判別共用体に並べて `type` で見分け、失敗の種類ごとに必要な値を持たせる
  (`{ type: 'TodoNotFound', todoId: string }`)。Repository・Gateway の interface のメソッドの失敗の型は Domain に定義する
- DTO の名前は、読む側の受け取るデータで付ける(todo そのものなら `TodoDto`、一覧の 1 行なら `TodoListItemDto`)。
  用途ごとに名前が分かれるので、同じ役割に DTO が増えても並べられる

### API のモジュール内の階層構造

上の層から下の層へだけ依存する(eslint-plugin-boundaries で強制している)。

1. facade, controller, worker
2. usecase
3. query, repository, gateway
4. domain

### web の構成

- `app/` は、機能ごとのディレクトリ(`features/`)と、どの機能にも属さないコードを置く `components/`・`composables/`・`utils/`・`generated/` で構成する。構成は bulletproof-react の project structure に合わせている

  ```
  app/
    app.vue, error.vue, layouts/, middleware/, plugins/, assets/
    pages/                  # Nuxt のルート。画面の中身を書き、複数の機能を組み合わせる
    features/<機能>/        # 必要なディレクトリだけを置く
      index.ts              # 機能の公開面。機能の外で使うものだけを export する
      components/           # その機能のコンポーネント
      composables/          # その機能の composable。API の取得と更新(TanStack Query)もここに書く
      utils/                # 純粋関数と型
    components/             # どの機能にも属さない、props とスロットだけで表示が決まる部品
    composables/            # どの機能にも属さない composable
    utils/                  # どの機能にも属さない純粋関数
    generated/api/          # API の生成物
  ```

- 画面の中身は `app/pages/` のルートのファイルに書く。機能のディレクトリには画面を置かない
- 機能は、別の機能を import しない。複数の機能を使う処理は `app/pages/` のルートに書く
- 機能の外からは、機能の `index.ts` だけを import する(`import { TodoList, useTodos } from '~/features/todo'`)。機能の中のファイルどうしと `test/` のテストは、ファイルを指定して import する
- 依存の向きは、`app/utils`・`app/composables`・`app/components` → 機能 → `app/pages`・`layouts`・`middleware`・`plugins` の一方向にする。
  機能の `utils/` はいちばん下の層で、API の生成物を呼ぶのは composable だけにする。規則は eslint-plugin-boundaries で強制している(`apps/web/eslint.config.mjs`)
- 生成された型(`types.gen`)はどの層からも import しない。画面が必要とする形は機能の `utils/` で構造的に宣言し、API の戻り値は推論で受ける
- 自作のコードは、使うファイルが明示的に import する。自動 import で使うのは、Vue・Nuxt の API と、Nuxt・Nuxt UI のコンポーネントだけ(`nuxt.config.ts` の `components.dirs` と `imports.scan`)
- API の取得と更新は TanStack Query(`@tanstack/vue-query`)で、機能の `composables/` の composable の中に書く。`useAsyncData` は使わない。
  `queryKey` と取得・更新の関数は手で書かず、生成された `…Options()` / `…Mutation()`(`app/generated/api/@tanstack/vue-query.gen.ts`)を渡す。`…Mutation()` の戻り値をスプレッドするときは `asMutationOptions` を通す
- 取得結果は、購読する画面が無くなったらキャッシュから削除する(`plugins/vue-query.ts` で QueryClient の既定の `gcTime` を 0 にしている)
- 更新のあとに取得し直す取得は、`useMutation` の `meta.invalidates` に queryKey で書く。取得し直す処理は `plugins/vue-query.ts` の MutationCache の `onSettled` にだけ置く
- 更新の失敗は `useMutation` の `onError` で `useNotify` の `error` を呼び、トーストで伝える。失敗は生成クライアント(hey-api の axios クライアント)が `AxiosError` で型付けする。接続の失敗は `error.response` が無いことで見分ける
- composable は `useMutation` の `mutate` を操作の名前(`addTodo`)で返す。画面に固有の後処理(入力欄を空にするなど)は、画面が `mutate` の第 2 引数のコールバックに書く
- 相対 import は使わない(`~` / `#shared` / `#server` のエイリアス)
- props は分割代入せず `const props = defineProps<...>()` で受け、script でもテンプレートでも `props.x` と参照する。ESLint(`vue/define-props-destructuring` と自作の `local/no-bare-props-in-template`)で強制している
- 素の名前で書けると、それが prop か script のローカルか読んで分からず、参照する位置が computed の依存の追跡に関わることも見えなくなるため
- 入力は送る前に `@myapp/contracts` のスキーマで検証する(`UForm` の `schema` に渡す)。検証の規則と文言を web 側に書き直さない
- 見た目は Nuxt UI のコンポーネントと Tailwind で組む。デザイントークン(配色・角丸・余白)は `app/assets/css/app.css` の `@theme` に置く。
  配色の割り当て(primary にどの色を当てるか)とコンポーネントの見た目の上書きは `app/app.config.ts` に集め、画面ごとの class で都度書かない

### テスト

- API の結合テストは `apps/api/test/specs/` に、エンドポイント(`api/<資源>/<操作>.spec.ts`)・ジョブ(`jobs/`)・運用の契約(`platform/`)に分けて置く。
  前提のデータは `test/factories/` の factory(fishery)で DB に作り、確かめる値は API の応答から読む。外部サービスは MSW(`test/mocks/`)が HTTP の層で受け、ジョブは `useTestApp` の `jobs.drain()` でその場で処理する
- web は `app/utils/`・機能の `utils/` の純関数を単体で、画面と部品を Nuxt 環境の結合テスト(`apps/web/test/nuxt/specs/`)で確かめる。画面のテストは API の応答を MSW(`test/nuxt/mocks/`)で差し替え、利用者の操作から画面の表示とトーストまでを見る
- カバレッジは単体と結合を合算して測る。全体と純関数の層のしきい値は各パッケージの `vitest.config.ts`、PR で変更した行のカバレッジの基準は `.github/workflows/ci.yml` にある

## 作業ルール

@docs/workflow.md

上記に加え、判断が必要な場面では `docs/requirements.md`(要件 ID と実装状況はここが正)を
参照して決め、結果を `docs/decisions.md` に追記すること。

## やらないこと

- `git push` とデプロイは指示があるまで実行しない
- force 操作、履歴の書き換えはしない
- PR は squash マージで取り込む。ブランチは必ず main から切り、他の PR のブランチから派生させない
  (先行 PR の squash 後に衝突する)。手順は `docs/workflow.md`
- 見た目に関わる変更は、自分でブラウザを開いて確認する。デザインカンプを `docs/design/` に置いている場合は、それを正として突き合わせる。
  `docs/decisions.md` に残すのは、突き合わせても決められず人間の判断が要る点だけ

## ドキュメント

| 用途 | 場所 |
| --- | --- |
| 要件定義(要件 ID と実装状況はここが正) | `docs/requirements.md` |
| 判断の記録・要確認事項 | `docs/decisions.md` |
| 作業の進め方 | `docs/workflow.md` |
| システム構成設計 | `docs/architecture.md` |
| セットアップ・コマンド | `README.md` |
