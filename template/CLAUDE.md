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
pnpm dev        # DB コンテナ(compose.yml)を起動し、ルート .env を注入して api/web を起動
pnpm build
pnpm lint       # ESLint(--fix 付き)
pnpm typecheck
pnpm test       # vitest(純関数の単体)
pnpm test:cov   # 単体テストをカバレッジ付きで(CI はこちらを走らせ PR にコメントする)
pnpm test:integration  # 結合テスト(API は testcontainers の PostgreSQL、web は Nuxt 環境のコンポーネント)
pnpm depcruise  # 循環 import の検出
pnpm db         # drizzle-kit(例: pnpm db generate / pnpm db migrate)
```

インフラは `pnpm --filter @myapp/infra cdk <deploy|diff|synth>`(deploy と diff には AWS 認証情報が必要)。

`--filter` で直接実行するとルート `.env` の注入も DB コンテナの起動も行われない。通常はルートのスクリプトを使う。

## 前提

- 開発環境はルート駆動。環境変数はルート `.env` を `dotenv-cli` で注入し、パッケージ側から外を参照しない
- API では `process.env` を直接読まない。`apps/api/src/platform/config/env.schema.ts` に追加し、`AppConfigService` 経由で参照する。例外は Nest より先に走る `src/instrument.ts`(Sentry)だけで、そこも同じスキーマで検証して読む
- `@nestjs/config` の `validationSchema` は Standard Schema 対応。valibot をそのまま渡している
- `apps/api` の import は `#app/*` / `#test/*` のサブパス(`package.json` の `imports`)。相対 import は ESLint で禁止している
- web の API クライアントは `apps/api` の OpenAPI から生成する(`app/generated/api/`)。手で書かない
- API の全ルートは `/api` 接頭辞付き(`app.setup.ts` の `API_PREFIX`)。本番は手前のプロキシが `/api/*` だけを API に流し、web と同一オリジンで配信する前提。開発の API リファレンスは `http://localhost:3000/api/docs`
- コミット時に lefthook が lint・typecheck・depcruise と commitlint(コミットメッセージ)を走らせる。push 時はブランチ名を検査する
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
  mail-todo.gateway.ts
  job/
    notify-completed-todo.queue.ts
    notify-completed-todo.worker.ts
  todo.module.ts
  index.ts
```

- Domain は、Repository・Gateway の interface の定義と、Entity の定義、値オブジェクトの定義、ドメインサービスの定義を行う。
  Repository・Gateway の interface の定義では、Entity や値オブジェクトを I/F とする
- Controller の I/F は contracts で定義する。Usecase を呼ぶ。Usecase を呼び出すときと、レスポンスするときの整形は、
  Controller の内部でインラインに書く
- Facade の I/F は DTO。DTO は Facade 内に定義する。Usecase を呼ぶ。Usecase を呼び出すときと、戻り値を返すときの整形は、
  Facade の内部でインラインに書く
- Usecase の I/F は DTO。DTO は Usecase 内に定義する。Repository や Gateway、QueryService を呼ぶ。
  Repository を呼び出すときは、Entity の create メソッドを呼び出して Entity にして渡す。
  戻り値の DTO への整形は、Usecase の内部でインラインに書く。Repository と Gateway は interface で DI する
- QueryService の I/F は DTO。DTO は QueryService 内に定義する
- Repository の I/F は Domain から interface を import して implements する。Entity は Domain に定義し、
  データベースから受け取った値を Entity の from メソッドを呼び出して、Entity にして返す
- Gateway の I/F は Domain から interface を import して implements する。外部サービスとのやり取りを行う
- Repository・Gateway の実装クラスは、interface の名前の前に実装の手段を付け(`DrizzleTodoRepository`・`MailTodoGateway`)、
  ファイル名をクラス名に合わせる(`drizzle-todo.repository.ts`・`mail-todo.gateway.ts`)
- 同じ役割のファイルが 1 つのうちはモジュール直下に置き、複数になったら役割の名前のディレクトリにまとめる
  (`repository/drizzle-todo.repository.ts`・`repository/drizzle-todo-comment.repository.ts`)。
  controller・usecase・query・repository・gateway など、どの役割も同じ
- Worker は、Usecase を呼ぶ。エラーは throw する
- `Result` の失敗の型は、役割を問わずメソッドごとに定義する(`completeTodo` なら `CompleteTodoError`、`send` なら `SendMailError`)。
  そのメソッドで起こる失敗だけを、`type` で見分ける判別共用体で並べ、失敗の種類ごとに必要な値を持たせる
  (`{ type: 'TodoNotFound', todoId: string }`)。Repository・Gateway の interface のメソッドの失敗の型は Domain に定義する
- DTO の名前は、読む側が受け取るデータが何かで付ける(todo そのものなら `TodoDto`、一覧の 1 行なら `TodoListItemDto`)。
  用途ごとに名前が分かれるので、同じ役割に DTO が増えても並べられる

### API のモジュール内の階層構造

上の層から下の層へだけ依存する(eslint-plugin-boundaries で強制している)。

1. facade, controller, worker
2. usecase
3. query, repository, gateway
4. domain

### web の構成

- 層は FCIS。Functional Core は `app/utils/`(どこにも依存しない汎用の純関数。必要になったら作る)と `app/domain/`(utils だけに依存)の純関数、
  Imperative Shell は `app/composables/`・`app/pages/`・`app/plugins/`(I/O と状態)、View は `app/components/`・`app/layouts/`(描画に徹する)。
  依存の向きは eslint-plugin-boundaries で強制している
- 生成された API クライアント(`app/generated/`)を呼ぶのは composables と plugins だけ。生成された型(`types.gen`)はどの層からも import しない。
  画面が必要とする形は `app/domain/` で構造的に宣言し、API の戻り値は推論で受ける
- 相対 import は使わない(`~` / `#shared` / `#server` のエイリアス)
- 想定できる失敗は例外ではなく `Result`(neverthrow)で返す(API と同じ)。自前の Result 型は作らない。
  失敗の型も API と同じ `{ cause?: unknown, type: <種類> }` にし、`catch` した例外は捨てずに `cause` に載せる
- props は分割代入せず `const props = defineProps<...>()` で受け、script でもテンプレートでも `props.x` と参照する。ESLint(`vue/define-props-destructuring` と自作の `local/no-bare-props-in-template`)で強制している
- 素の名前で書けると、それが prop か script のローカルか読んで分からず、参照する位置が computed の依存の追跡に関わることも見えなくなるため
- 入力は送る前に `@myapp/contracts` のスキーマで検証する(`UForm` の `schema` に渡す)。検証の規則と文言を web 側に書き直さない
- 見た目は Nuxt UI のコンポーネントと Tailwind で組む。デザイントークン(配色・角丸・余白)は `app/assets/css/app.css` の `@theme` に置く。
  配色の割り当て(primary にどの色を当てるか)とコンポーネントの見た目の上書きは `app/app.config.ts` に集め、画面ごとの class で都度書かない

### テスト

- web は `app/domain/`・`app/utils/` の純関数と、主要コンポーネントの単体

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
