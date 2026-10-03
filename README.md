# ts-template

NestJS(API)+ Nuxt(web)を pnpm workspace + Turborepo でまとめたモノレポのひな形と、そこからプロジェクトを作る CLI。
作ったプロジェクトには、構成を示すサンプルとして `todo` モジュール(API)とその画面(web)が入る。

## プロジェクトを作る

```bash
npx github:tmprar/ts-template
```

GitHub からこのリポジトリを取得して CLI を起動し、次を尋ねる。答え終わると、ひな形を写して書き換え、
`.env` を `.env.example` から作り、git の初期化と依存のインストールまで済ませる。

| 質問 | 内容 |
| --- | --- |
| ディレクトリ | 作る先。空か、まだ無いディレクトリ |
| プロジェクト名 | 英小文字・数字・ハイフン。既定はディレクトリ名から作る。パッケージの scope(`@my-app/api`)・DB 名・CDK のスタック名(`MyAppProd`)になる |
| AWS CDK のパッケージを含めるか | `apps/infra`(空のスタックだけ)。含めない場合はこのパッケージと文書の該当箇所を取り除く |
| git リポジトリを初期化するか | `git init --initial-branch main` |
| 依存をインストールするか | `pnpm install`(lefthook が git のフックを登録するため、リポジトリの初期化が要る) |

引数で答えておくこともできる(`npx github:tmprar/ts-template --help`)。

```bash
npx github:tmprar/ts-template my-app --name my-app --no-infra --yes   # 残りは既定値(すべて「はい」)で進める
npx github:tmprar/ts-template#v1.0.0                                  # タグやブランチを指定して取得する
```

Node.js 22 以上が要る。作ったプロジェクトの開発には、さらに pnpm と Docker が要る(バージョンはそのプロジェクトの README)。

## 構成

- `template/`: ひな形の中身。作ったプロジェクトにそのまま写る。中の構成と規約は `template/README.md`・`template/CLAUDE.md`
- `src/`: CLI(`create-ts-template`)。対話は `@clack/prompts`、引数の解析は `mri`
- `.github/workflows/ci.yml`: このリポジトリの CI。CLI の検査と、CLI で作ったプロジェクトの検査

`npx github:` は、リポジトリを clone して `prepare`(= `pnpm build`)でビルドし、`package.json` の `files`
(`dist` と `template`)をパッケージに詰めて実行する。npm は `.gitignore` と `.npmrc` をパッケージに入れないので、
ビルド時にその中身を `dist/dotfiles.json` に書き出し、CLI がプロジェクトを作るときに戻す。

## ひな形を保守する

```bash
pnpm install                    # CLI の依存
pnpm --dir template install     # ひな形の依存(CLI の lint もひな形の共有 ESLint 設定を使う)。git のフックもここで登録される
pnpm build                      # CLI をビルドする(dist/)
node dist/index.js ../sample-app --name sample-app --yes   # 実際に作って確かめる
```

- CLI の検査は `pnpm lint` / `pnpm typecheck` / `pnpm test`(`node:test`)/ `pnpm test:cov`
- ひな形の中で開発するときは `template/` に移って、ひな形の README のとおりにコマンドを実行する
- 書き換えの約束(プレースホルダの表記、`template` / `infra` の印)は `CLAUDE.md` の「ひな形としての約束」を参照
- 自分のリポジトリで配るときは、`src/cli.ts` の `HELP` と、この README の `tmprar/ts-template` を自分のリポジトリに合わせる
