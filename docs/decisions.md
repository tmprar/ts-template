# 判断の記録

ひな形(このリポジトリ)の保守で決めたことと、人間に確認してほしいことを時系列で追記する。
書式は `template/docs/workflow.md` の「docs/decisions.md の書式」に従う。作ったプロジェクトの判断は、そのプロジェクトの `docs/decisions.md` に書く。

## 2026-10-03 ひな形を template/ に置き、npx でリポジトリを指定して作る
- 決定: create-vite と同じく、ルートを CLI のパッケージ、ひな形の中身を `template/` にする。利用者は `npx github:tmprar/ts-template` で起動し、対話に答えると、写す・書き換える・`.env` を作る・`git init`・`pnpm install` までを済ませる。giget による取得、`--template`、`--in-place`(GitHub の template repository として使う形)はやめる
- 決定: CLI の devDependencies は `typescript` と `@types/node` だけにし、テストは `node:test`、lint はひな形の共有 ESLint 設定(`template/` に入る eslint)を使う
- 理由: `npx github:` は devDependencies まで入れてから `prepare` でビルドする。vitest と ESLint 一式を入れると install が約 3 秒から約 28 秒(127MB)に延びた(npm.flatt.tech、キャッシュなしで計測)
- 決定: npm がパッケージから落とす `.gitignore` と `.npmrc` は、ビルド時に `dist/dotfiles.json` に書き出して CLI が戻す。create-vite のように `_gitignore` へ改名しない
- 理由: 改名するとひな形の中で開発するときに、入れ子の `.gitignore` と `.npmrc`(レジストリの指定)が効かなくなる
- 要確認: 取得元の `tmprar/ts-template` は以前の CLI の既定値(`gh:tmprar/ts-template`)に合わせた。実際の GitHub のリポジトリ名が違うなら、`src/cli.ts` の `HELP` と README・CLAUDE.md の記述を直す
