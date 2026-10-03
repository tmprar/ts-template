# 判断の記録

テンプレート(このリポジトリ)の保守で決めたことと、人間に確認してほしいことを時系列で追記する。
書式は `template/docs/workflow.md` の「docs/decisions.md の書式」に従う。作ったプロジェクトの判断は、そのプロジェクトの `docs/decisions.md` に書く。

## 2026-10-03 テンプレートを template/ に置き、npx でリポジトリを指定して作る
- 決定: create-vite と同じく、ルートを CLI のパッケージ、テンプレートの中身を `template/` にする。利用者は `npx github:tmprar/ts-template#release` で起動し、対話に答えると、写す・書き換える・`.env` を作る・`git init`・`pnpm install`・`pnpm lint` までを済ませる。giget による取得、`--template`、`--in-place`(GitHub の template repository として使う形)はやめる
- 決定: `apps/infra` は常に含める。含めるかどうかの質問と、それに伴う `infra` の印・lockfile の書き換えはやめる
- 決定: `dist/` は main にコミットせず、main に入ったら CI がビルドして `release` ブランチに積む。利用者は `#release` を指定する。`prepare` は書かず、ビルドのスクリプトも `build` ではなく `compile` と呼ぶ
- 理由: `npx github:` はビルドしないので、ビルド済みの `dist/` が要る。main にコミットすると PR の差分に混ざり、並行する PR どうしで衝突する
- 理由: npm は git の依存に `prepare`・`build`・`install` 系・`prepack` のスクリプトがあると、clone 先で devDependencies まで入れる。`build` があるだけで npx がキャッシュなしで約 22 秒かかり、外すと約 2 秒になった(npm.flatt.tech で計測)
- 決定: CLI の ESLint 設定(`eslint.config.mjs`)と tsconfig は CLI 専用に持つ。テンプレートのファイルは読まず、規則を揃えることもしない
- 決定: install の後に `pnpm lint` を流す
- 理由: import の並びはパッケージ名で決まるため、`@myapp` を置き換えると規約から外れるファイルが出る(`@sample-app/contracts` が `@nestjs/*` より後ろに来る)。最初のコミットに整形の差分を混ぜない
- 決定: npm がパッケージから落とす `.gitignore` と `.npmrc` は、ビルド時に `dist/dotfiles.json` に書き出して CLI が戻す。create-vite のように `_gitignore` へ改名しない
- 理由: 改名するとテンプレートの中で開発するときに、入れ子の `.gitignore` と `.npmrc`(レジストリの指定)が効かなくなる

## 2026-10-03 CLI の Node の下限を 24 にし、CLI の CI に版を直接書く
- 決定: ルートの `package.json` の `engines.node` を `>=22` から `>=24` に上げる
- 理由: 作ったプロジェクトは Node 24 を要求するので、22 で CLI だけ動いても開発に進めない。22 で動くことは CI でも確かめていなかった
- 決定: `ci.yml`(`cli`・`generated`)と `release.yml` は、Node(`24`)と pnpm(`12`)をワークフローに直接書く。`template/package.json` からは読まない
- 理由: CLI の検査がテンプレートのファイルに依存すると、テンプレートの版を上げただけで CLI を検査する版まで変わり、`engines` の約束(下限)を確かめられなくなる。CLI は `packageManager`・`devEngines` を書けない(`npx` が利用者の環境で止まる)ので、書く場所はワークフローになる
- 理由: `generated` も、利用者と同じく CLI を動かす環境だけを用意する。作ったプロジェクトが要求する版には、そのプロジェクトの `packageManager`・`devEngines`(`onFail: download`)を見て pnpm が切り替えるので、この仕組みが効くことも併せて確かめられる

## 2026-10-04 メールの送信は Usecase が MailService を呼び、件名と本文は Domain の build 関数で組み立てる
- 決定: サンプルの `todo` から `MailTodoGateway` と `TodoGateway` の interface を消し、`TodoUsecase` が `MailService`(`platform/mail`)を直接呼ぶ。宛先(`TODO_NOTICE_MAIL_TO`)の解決も Usecase に移す
- 決定: 件名と本文は Domain の `buildCompletedTodoMail` が組み立てる。本文は eta のテンプレートにして、モジュールの `assets/`(`assets/completed-todo-mail.eta`)に置く。件名は 1 行なので build 関数に直接書く
- 決定: `eta` を API の依存に加える(採用済みのスタックの外だが、指示による)。平文のメールなので `autoEscape` は切る
- 決定: `nest build` はテンプレートを `dist/` に写さないので、`nest-cli.json` の `assets` に `modules/*/assets/**/*` を足す
- 理由: Domain がテンプレートのファイルを読むことになるが、テンプレートはコードと一緒に配る固定の資産で、内容は実行中に変わらない。Domain の単体テストで件名と本文を確かめられる
- 決定: Gateway の規約(`template/CLAUDE.md`)は残す。サンプルに実装は無くなるが、モジュールが外部サービスと直接やり取りするときの置き場所として要る
- 決定: 本文の末尾の改行は残す(テンプレートのファイルの末尾の改行がそのまま出る)。build 関数では落とさない
