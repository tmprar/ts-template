# ts-template

NestJS(API)+ Nuxt(web)のモノレポのひな形と、そこからプロジェクトを作る CLI(`npx github:tmprar/ts-template`)。
create-vite と同じく、ひな形の中身を `template/` に置き、CLI がそれを写して書き換える。

- `template/`: ひな形の中身。作ったプロジェクトにそのまま写る。中の構成・規約・コマンドは `template/CLAUDE.md` が正
- `src/`: CLI(`create-ts-template`)。`cli.ts` が対話(`@clack/prompts`)と引数(`mri`)、`template.ts` がファイル操作、
  `text.ts` が文字列の書き換え(純関数)
- ルートの `package.json`・`lefthook.yml`・`.github/workflows/ci.yml` はこのリポジトリ用。
  作ったプロジェクトのものは `template/` の下にある

## ひな形としての約束

作ったプロジェクトへ持ち込みたくない記述は、次の約束で CLI が取り除く。

- プロジェクト名は `myapp`(scope・コンテナ名・パス)/ `MyApp`(CDK のスタック名)/ `MYAPP`(環境変数の接頭辞)の
  3 つの表記だけで書く。CLI が 1 回の走査で置き換えるので、他の表記(`my-app`、`my_app`)を作らない
- `<!-- template:start -->` 〜 `<!-- template:end -->`(YAML では `# template:start` 〜 `# template:end`)は、作ったプロジェクトから中身ごと消える
- `<!-- infra:start -->` 〜 `<!-- infra:end -->`(同 `# infra:start` 〜 `# infra:end`)は、インフラを含めない場合に中身ごと消える。
  印は 1 行に単独で書く。コードブロックと表の中には書けないので、消し分けたい内容は箇条書きか段落にする
- ひな形を変えたら、`pnpm build && node dist/index.js <dir> --name sample-app --yes`(インフラを含めない形も `--no-infra` で)で実際に作り、
  作ったプロジェクトで lint・typecheck・depcruise・テストが通ることを確かめる

## コマンド

```bash
pnpm install                  # CLI の依存
pnpm --dir template install   # ひな形の依存。CLI の lint にも要る。git のフックもここで登録される
pnpm build                    # tsc と、dist/dotfiles.json の書き出し
pnpm lint                     # ESLint(ひな形の共有設定。--fix 付き)
pnpm typecheck
pnpm test                     # node:test(text.ts の純関数)
pnpm test:cov                 # カバレッジ付き(text.ts は 100% を要求する)
```

ひな形の中のコマンドは `template/` に移って実行する(`template/CLAUDE.md` の「コマンド」)。

## 前提(知らないと踏む)

- `npx github:` は clone したリポジトリで devDependencies まで入れてから `prepare` でビルドする。起動を遅くしないよう、
  CLI の devDependencies は `typescript` と `@types/node` だけにしている。テストは `node:test`、lint はひな形の
  `template/packages/eslint-config` に入っている eslint とプラグインを使う(ルートに足さない)
- npm は `.gitignore` と `.npmrc` をパッケージに入れない。ビルド時に `template/` の中のそれらを `dist/dotfiles.json` に
  書き出し、npm から取得したときだけ CLI が戻す。git で clone したリポジトリから動かすときは `git ls-files` で写す
  (開発中の `node_modules` や `.env` を写さないため)
- ルートの `package.json` に `packageManager`・`devEngines` を書かない。`npx` の install が利用者の Node・pnpm のバージョンで止まる
- `src/` の相対 import は拡張子 `.ts` で書く(`node:test` が型を剥がして直接動かすため。`tsc` が `.js` に書き換える)
- git のフックはルートの `lefthook.yml`。lefthook は git のルートの設定しか読まないので、`template/lefthook.yml` は
  作ったプロジェクトでだけ効く。ひな形の検査を変えたら両方を合わせる

## 作業ルール

進め方・検証・コミットとブランチの規約は `template/docs/workflow.md` に従う。ただし要件 ID はひな形には無いので付けない
(例: `feat: npx でリポジトリを指定してプロジェクトを作れるようにする`)。
判断が必要な場面の結果は `docs/decisions.md` に追記する。

## やらないこと

- `git push` は指示があるまで実行しない
- force 操作、履歴の書き換えはしない
- PR は squash マージで取り込む。ブランチは必ず main から切る
