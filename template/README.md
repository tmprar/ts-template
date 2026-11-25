# myapp

NestJS(API)と Nuxt(web)を pnpm workspace と Turborepo で構成したモノレポ。
構成を示すサンプルとして、`todo` の機能が 1 つ入っている。

## 構成

- `apps/api/`: NestJS の API(`@myapp/api`)。`Dockerfile` は本番イメージ用
- `apps/web/`: Nuxt のフロントエンド(`@myapp/web`)
- `apps/infra/`: AWS CDK(`@myapp/infra`)。テンプレートの時点では空のスタックだけがある
- `packages/contracts/`: API の入出力スキーマ(`@myapp/contracts`)
- `packages/typescript-config/`: 共有の tsconfig(`@myapp/typescript-config`)
- `packages/eslint-config/`: 共有の ESLint 設定(`@myapp/eslint-config`)

## セットアップ

Node.js(バージョンは `package.json` の `devEngines`)、pnpm、Docker が必要である。
スタンドアロンスクリプトのpnpmをインストールしている場合、自動的にNode.js、pnpmのバージョンが変更される。

```bash
pnpm install
pnpm db migrate      # DB コンテナを立ち上げ、テーブルを作る
pnpm dev             # 開発に必要なコンテナを立ち上げた後、開発サーバーを立ち上げる
```

ADR(`docs/adr/`)を作成・変更するには、[adrs](https://github.com/joshrotenberg/adrs) の CLI をインストールしておく。入っていないと、ADR を含むコミットで lefthook の検査が失敗する。

Claude Code で作業するときは、`jq` と Claude Code の CLI(`claude`)をインストールしておく。`.claude/settings.json` のフックが、作業を終えるときに変えた Markdown の文章を点検し、`git push` の前に `docs/review/` の観点でブランチの差分をレビューする。

PR を Claude Code でレビューさせるには(`.github/workflows/claude-code-review.yml`)、リポジトリの secrets に `CLAUDE_CODE_OAUTH_TOKEN`(`claude setup-token` で発行する)を設定する。PR やコメントで `@claude` と書くと、`.github/workflows/claude.yml` が応答する。

依存は、`.npmrc` で指定した [Takumi Guard](https://flatt.tech/takumi/features/guard) のレジストリ(npm の公開レジストリへの代理で、悪意のあるパッケージを止める)から取得する。CI は GitHub の OIDC トークンで Takumi Guard に Bot として認証するので、Takumi Guard で Bot を登録し、その ID をリポジトリの variables に `TAKUMI_GUARD_BOT_ID` として設定する。

ルートの `.env` は [dotenvx](https://dotenvx.com/) で値を暗号化してコミットしている。復号の鍵 `.env.keys` を既存の開発者から安全な経路で受け取り、ルートに置く。`.env.keys` はコミットしない。値の追加と変更は `pnpm exec dotenvx set <名前> <値>` で行う(暗号化した状態で書き込まれる)。

開発者ごとに異なる値は `.env.local` に `pnpm exec dotenvx set -f .env.local <名前> <値>` で書く。`.env.local` はコミットせず、同じ名前の値は `.env` より優先される。

<!-- template:start -->
テンプレート(`template/`)の中で開発するときは、`.env` をコミットしない(`.gitignore` で無視している)。`cp .env.example .env` で作り、暗号化はしない。
<!-- template:end -->

`pnpm dev` を実行すると、次の URL で確認できる。

- web: `http://localhost:5173`
- API: `http://localhost:3000/api/`
- API リファレンス(Scalar): `http://localhost:3000/api/docs`

`pnpm db migrate` は、マイグレーションを追加したときにも実行する。

## 外部サービス

API は次の 2 つのサービスと連携する。開発では、どちらも設定せずに動かす。

| サービス | 用途                                                                                    | 設定(環境変数)                                               | 未設定のとき               |
| -------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| Sentry   | 5xx のエラーと、リトライが尽きたジョブを記録する。トレースは 1 割をサンプリングして送る | `SENTRY_DSN`(任意で `SENTRY_ENVIRONMENT` / `SENTRY_RELEASE`) | 何も送らない               |
| Resend   | メールを送信する(`apps/api/src/platform/mail` の `MailService`)                         | `RESEND_API_KEY` と `MAIL_FROM`                              | 送信せず、文面をログに出す |

production では `RESEND_API_KEY` と `MAIL_FROM` の両方が必須で、どちらかが欠けていると API は起動に失敗する。

サンプルの `todo` は、完了になると `TODO_NOTICE_MAIL_TO` の宛先にメールで通知する。未設定なら通知しない。

## コマンド

ルートで実行する。turbo を使って全パッケージを対象に依存関係も考慮してコマンドを実行する。

```bash
pnpm build             # ビルド
pnpm lint              # ESLint
pnpm typecheck         # 型検査
pnpm test              # ユニットテスト(vitest)
pnpm test:cov          # 単体と結合を合わせて実行し、カバレッジを合算する(CI はこちらを実行し、PR にコメントする)
pnpm test:integration  # 結合テスト(api は testcontainers の PostgreSQL、web は Nuxt 環境のコンポーネントと composable)
pnpm test:mutation     # ミューテーションテスト(Stryker。api の domain と shared だけ。レポートは apps/api/reports/mutation/)
pnpm depcruise         # 循環 import の検出
pnpm lint:text         # 日本語の文章の検査(textlint)
pnpm dev               # 開発サーバー(watch)。DB コンテナも起動し、.env.local・.env を注入する
pnpm compose           # Docker Compose(.env.local・.env を復号して注入する。例: pnpm compose ps / pnpm compose down)
pnpm db                # drizzle-kit(例: pnpm db generate / pnpm db migrate)
```

特定のパッケージだけで実行するときは `--filter` を使う。

```bash
pnpm --filter @myapp/api dev
```

`--filter` で直接実行すると、ルートの `.env.local`・`.env` の注入も DB コンテナの起動も行われない。通常はルートの `pnpm dev` を使う。API は必須の環境変数が無いと起動時の検証で止まるので、`--filter` で起動するときは環境変数を自分で渡す。

## 最初にやること

1. `docs/requirements.md` に、自分のプロジェクトの要件を書く
2. サンプルの `todo` を、自分の最初の機能に置き換える。変更する場所は次のとおり(構成の説明は `CLAUDE.md` にある)
   - `packages/contracts/src/todo.ts`(入出力スキーマ)
   - `apps/api/src/db/schema.ts` と `apps/api/drizzle/`(テーブル定義とマイグレーション。`pnpm db generate` で作り直す)
   - `apps/api/src/modules/todo/` と `apps/api/src/app.module.ts`(メール送信の `platform/mail/` はそのまま使える)
   - `apps/api/src/platform/config/env.schema.ts` の `TODO_NOTICE_MAIL_TO`
   - `apps/api/test/features/user/`、`apps/api/test/support/todos.ts`、`apps/api/test/platform/` のうち `todo` を参照している箇所
   - `apps/web/app/` の `pages/index.vue`・`composables/useTodos.ts`・`components/TodoListItem.vue`・`domain/todo.ts` と、`apps/web/test/components/`
3. GitHub で main を対象にした branch ruleset を作る(Settings → Rules → Rulesets → New ruleset → New branch ruleset)。
   Enforcement status を Active にし、Branch protections で次の 2 つを有効にする。
   - Require status checks to pass before merging(検査には CI のジョブを選ぶ)
   - Require branches to be up to date before merging

   CI(`.github/workflows/ci.yml`)は PR でしか実行されないため、この設定が無いと、CI を通っていない内容が main に入りうる

## 本番へのデプロイ

デプロイ先とデプロイの手順は、プロジェクトごとに決める。テンプレートが用意しているのは次の 3 つだけである。

- `apps/api/Dockerfile`: API の本番イメージ(`docker build -f apps/api/Dockerfile -t myapp-api .`)。マイグレーションは `node dist/scripts/migrate` で適用する
- `apps/web`: `pnpm turbo run generate --filter @myapp/web` で静的に生成する(出力先は `apps/web/.output/public`)。
  API と同一オリジンで配信し、`/api/*` だけを API に転送する前提である
- `apps/infra`: AWS CDK の空のスタック(`lib/stacks/app-stack.ts`)。AWS にデプロイするなら、ここにリソースを追加する

## ドキュメント

| 用途                                          | 場所                             |
| --------------------------------------------- | -------------------------------- |
| AI エージェント向けの指示(規約と作業の進め方) | `CLAUDE.md` / `docs/workflow.md` |
| 要件定義(要件 ID)                             | `docs/requirements.md`           |
| 判断の記録・要確認事項(ADR。adrs で管理する)  | `docs/adr/`                      |
| レビューの観点(Claude のレビューと手元の点検)  | `docs/review/`                   |
| Codex などのエージェント向けの入口             | `AGENTS.md`                      |
| システム構成設計                              | `docs/architecture.md`           |
