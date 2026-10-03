# ts-template

NestJS(API)+ Nuxt(web)を pnpm workspace + Turborepo でまとめたモノレポのひな形と、そこからプロジェクトを作る CLI。
作ったプロジェクトには、構成を示すサンプルとして `todo` モジュール(API)とその画面(web)と、
AWS CDK の空のスタック(`apps/infra`)が入る。

## プロジェクトを作る

```bash
npx github:tmprar/ts-template#release
```

GitHub からこのリポジトリの `release` ブランチ(ビルド済みの CLI が入っている)を取得して CLI を起動し、次を尋ねる。答え終わると、ひな形を写して書き換え、
`.env` を `.env.example` から作り、git の初期化、依存のインストール、`pnpm lint` による整形まで済ませる
(そのまま最初のコミットができる)。

| 質問 | 内容 |
| --- | --- |
| ディレクトリ | 作る先。空か、まだ無いディレクトリ |
| プロジェクト名 | 英小文字・数字・ハイフン。既定はディレクトリ名から作る。パッケージの scope(`@my-app/api`)・DB 名・CDK のスタック名(`MyAppProd`)になる |
| git リポジトリを初期化するか | `git init --initial-branch main` |
| 依存をインストールするか | `pnpm install` と `pnpm lint`(lefthook が git のフックを登録するため、リポジトリの初期化が要る)。import の並びはパッケージ名で決まるので、名前を置き換えた後に整える |

引数で答えておくこともできる(`npx github:tmprar/ts-template#release --help`)。

```bash
npx github:tmprar/ts-template#release my-app --name my-app --yes   # 残りは既定値(すべて「はい」)で進める
```

Node.js 22 以上が要る。作ったプロジェクトの開発には、さらに pnpm と Docker が要る(バージョンはそのプロジェクトの README)。

## 構成

- `template/`: ひな形の中身。作ったプロジェクトにそのまま写る。中の構成と規約は `template/README.md`・`template/CLAUDE.md`
- `src/`: CLI(`create-ts-template`)。対話は `@clack/prompts`、引数の解析は `mri`
- `bin/create-ts-template.js`: CLI の入口。`dist/` が無い(main を取得した)ときは `#release` を付けるよう案内して止める
- `.github/workflows/ci.yml`: PR の CI。CLI の検査と、CLI で作ったプロジェクトの検査
- `.github/workflows/release.yml`: main に入ったら、ビルドした `dist/` を載せたコミットを `release` ブランチに積む
  (`scripts/publish-release.sh`)

`npx github:` は、リポジトリを clone して `package.json` の `files`(`bin`・`dist`・`template`)をパッケージに詰め、
実行時の依存(`@clack/prompts` と `mri`)だけを入れて動かす。ビルドはしないので、ビルド済みの `dist/` が要る。
main には `dist/` を入れず、CI が `release` ブランチにだけ載せる。
npm は `.gitignore` と `.npmrc` をパッケージに入れないので、ビルド時にその中身を `dist/dotfiles.json` に書き出し、
CLI がプロジェクトを作るときに戻す。

`release` ブランチは CI だけが更新する。GitHub の branch protection(または ruleset)で、人の push を禁じておく。

## ひな形を保守する

```bash
pnpm install                    # CLI の依存
pnpm --dir template install     # ひな形の依存。git のフックもここで登録される
pnpm compile                    # CLI をビルドする(dist/。コミットはしない)
node dist/index.js ../sample-app --name sample-app --yes   # 実際に作って確かめる
```

- CLI の検査は `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm test:cov`
- `dist/` はコミットしない。main に入ると CI が作って `release` ブランチに載せる
- ひな形の中で開発するときは `template/` に移って、ひな形の README のとおりにコマンドを実行する
- 書き換えの約束(プレースホルダの表記、`template` の印)は `CLAUDE.md` の「ひな形としての約束」を参照
