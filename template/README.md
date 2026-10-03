# myapp

NestJS(API)+ Nuxt(web)を pnpm workspace + Turborepo でまとめたモノレポ。

## 構成

- `apps/api/`: NestJS API (`@myapp/api`)。`Dockerfile` は本番イメージ
- `apps/web/`: Nuxt フロントエンド (`@myapp/web`)
- `packages/contracts/`: API の入出力スキーマ (`@myapp/contracts`)
- `packages/typescript-config/`: 共有 tsconfig (`@myapp/typescript-config`)
- `packages/eslint-config/`: 共有 ESLint 設定 (`@myapp/eslint-config`)
- `apps/infra/`: AWS CDK (`@myapp/infra`)。ひな形の時点では空のスタックだけ

## セットアップ

Node.js(バージョンは `package.json` の `devEngines`)、pnpm、Docker が要る。

```bash
pnpm install
cp .env.example .env
pnpm dev
```

- web: `http://localhost:5173`
- API: `http://localhost:3000/api/`、API リファレンス(Scalar)は `http://localhost:3000/api/docs`
- DB: `compose.yml` の PostgreSQL。テーブルは `pnpm db migrate` で作る(初回と、マイグレーションを足したあと)

## 外部サービス

API には次の 2 つとの連携が入っている。どちらも開発では設定しなくても動く。

| サービス | 用途 | 設定(環境変数) | 未設定のとき |
| --- | --- | --- | --- |
| Sentry | 5xx と、リトライが尽きたジョブの記録。トレース(1 割をサンプリング) | `SENTRY_DSN`(任意で `SENTRY_ENVIRONMENT` / `SENTRY_RELEASE`) | 何も送らない |
| Resend | メールの送信(`apps/api/src/platform/mail` の `MailService`) | `RESEND_API_KEY` と `MAIL_FROM` | 送信せず文面をログに出す。production では両方が必須で、欠けていると起動時に落ちる |

サンプルの todo は、完了になると `TODO_NOTICE_MAIL_TO` の宛先へメールで知らせる(未設定なら知らせない)。

## コマンド

ルートから turbo 経由で全パッケージに実行される。

```bash
pnpm build      # ビルド
pnpm lint       # ESLint
pnpm typecheck  # 型検査
pnpm test       # ユニットテスト (vitest)
pnpm test:cov   # ユニットテスト + カバレッジ (CI はこちらを実行し PR にコメント)
pnpm test:integration  # 結合テスト(api: testcontainers の PostgreSQL / web: Nuxt 環境のコンポーネント・composable)
pnpm depcruise  # 循環 import の検出
pnpm dev        # 開発サーバー (watch)。DB コンテナ (compose.yml) も起動し、.env を注入する
pnpm db         # drizzle-kit(例: pnpm db generate / pnpm db migrate)
```

特定パッケージのみ実行する場合:

```bash
pnpm --filter @myapp/api dev
```

※ `--filter` で直接実行する場合はルート `.env` の注入と DB コンテナの起動が行われないため、通常はルートの `pnpm dev` を使うこと。

## 最初にやること

1. `docs/requirements.md` に自分のプロジェクトの要件を書く
2. サンプルの `todo` を自分の最初の機能に置き換える。触る場所は次のとおり(構成の説明は `CLAUDE.md`)
   - `packages/contracts/src/todo.ts`(入出力スキーマ)
   - `apps/api/src/db/schema.ts` と `apps/api/drizzle/`(テーブル定義とマイグレーション。`pnpm db generate` で作り直す)
   - `apps/api/src/modules/todo/`、`apps/api/src/app.module.ts`(メール送信の `platform/mail/` はそのまま使える)
   - `apps/api/src/platform/config/env.schema.ts` の `TODO_NOTICE_MAIL_TO`
   - `apps/api/test/features/user/`、`apps/api/test/support/todos.ts`、`apps/api/test/platform/` の `todo` を参照している箇所
   - `apps/web/app/` の `pages/index.vue`・`composables/useTodos.ts`・`components/TodoListItem.vue`・`domain/todo.ts` と `apps/web/test/components/`
3. CI(`.github/workflows/ci.yml`)は PR でだけ走る。main の branch protection で required checks と「up to date を必須」を設定する

## 本番への配備

配備先と配備の手順はプロジェクトごとに決める。ひな形が用意しているのは次だけ。

- `apps/api/Dockerfile`: API の本番イメージ(`docker build -f apps/api/Dockerfile -t myapp-api .`)。マイグレーションは `node dist/scripts/migrate` で適用する
- web は `pnpm turbo run generate --filter @myapp/web` で静的に生成する(`apps/web/.output/public`)。API と同一オリジンで配信し、`/api/*` だけを API に流す前提
- `apps/infra`: AWS CDK の空のスタック(`lib/stacks/app-stack.ts`)。AWS に配備するならここへリソースを足す

## ドキュメント

| 用途 | 場所 |
| --- | --- |
| 開発の進め方(AI エージェント向けの指示を含む) | `CLAUDE.md` / `docs/workflow.md` |
| 要件定義(要件 ID と実装状況) | `docs/requirements.md` |
| 判断の記録・要確認事項 | `docs/decisions.md` |
| システム構成設計 | `docs/architecture.md` |
