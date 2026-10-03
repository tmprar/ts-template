# 判断の記録

ひな形(このリポジトリ)の保守で決めたことと、人間に確認してほしいことを時系列で追記する。
書式は `template/docs/workflow.md` の「docs/decisions.md の書式」に従う。作ったプロジェクトの判断は、そのプロジェクトの `docs/decisions.md` に書く。

## 2026-10-03 ひな形を template/ に置き、npx でリポジトリを指定して作る
- 決定: create-vite と同じく、ルートを CLI のパッケージ、ひな形の中身を `template/` にする。利用者は `npx github:tmprar/ts-template#release` で起動し、対話に答えると、写す・書き換える・`.env` を作る・`git init`・`pnpm install`・`pnpm lint` までを済ませる。giget による取得、`--template`、`--in-place`(GitHub の template repository として使う形)はやめる
- 決定: `apps/infra` は常に含める。含めるかどうかの質問と、それに伴う `infra` の印・lockfile の書き換えはやめる
- 決定: `dist/` は main にコミットせず、main に入ったら CI がビルドして `release` ブランチに積む。利用者は `#release` を指定する。`prepare` は書かず、ビルドのスクリプトも `build` ではなく `compile` と呼ぶ
- 理由: `npx github:` はビルドしないので、ビルド済みの `dist/` が要る。main にコミットすると PR の差分に混ざり、並行する PR どうしで衝突する
- 理由: npm は git の依存に `prepare`・`build`・`install` 系・`prepack` のスクリプトがあると、clone 先で devDependencies まで入れる。`build` があるだけで npx がキャッシュなしで約 22 秒かかり、外すと約 2 秒になった(npm.flatt.tech で計測)
- 決定: CLI の ESLint 設定と tsconfig はひな形のファイルを読まず、写しを自分で持つ
- 決定: install の後に `pnpm lint` を流す
- 理由: import の並びはパッケージ名で決まるため、`@myapp` を置き換えると規約から外れるファイルが出る(`@sample-app/contracts` が `@nestjs/*` より後ろに来る)。最初のコミットに整形の差分を混ぜない
- 決定: npm がパッケージから落とす `.gitignore` と `.npmrc` は、ビルド時に `dist/dotfiles.json` に書き出して CLI が戻す。create-vite のように `_gitignore` へ改名しない
- 理由: 改名するとひな形の中で開発するときに、入れ子の `.gitignore` と `.npmrc`(レジストリの指定)が効かなくなる
