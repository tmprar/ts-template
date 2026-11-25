# 判断の記録

テンプレート(このリポジトリ)の保守で決めたことと、人間に確認してほしいことを時系列で追記する。
見出しは `## YYYY-MM-DD <主題>` にし、その下に「決定:」「理由:」「要確認:」で始まる箇条を並べる。「要確認」に書くのは、資料を読み突き合わせても決められず、人間の判断が要る点だけにする。
作ったプロジェクトの判断は、そのプロジェクトの `docs/adr/` に ADR として記録する(`template/docs/workflow.md` の「判断の記録」)。

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

## 2026-11-24 作ったプロジェクトの .env を dotenvx で暗号化してコミットする
- 決定: akitoki(#96, #97)に合わせ、`dotenv-cli` を `@dotenvx/dotenvx` に替え、ルートのスクリプトを `dotenvx run -f .env.local -f .env --` にする。Docker Compose は `pnpm compose` から復号して実行し、`compose:up`・`compose:down` はなくす
- 決定: テンプレートに鍵は置かない。CLI が `.env.example` を `.env` に改名し、install と lint の後に `pnpm exec dotenvx encrypt` を実行して、プロジェクトごとの鍵 `.env.keys` を作る。install しないときは次にやることに `pnpm exec dotenvx encrypt` を出す
- 決定: テンプレートの中では `.env` を `.gitignore` で無視し続ける(`# template:start` の印で囲み、作ったプロジェクトからは消す)。`.env.keys` はどちらでも無視する
- 理由: テンプレートに暗号化した `.env` と鍵を置くと、作ったプロジェクトがすべて同じ鍵を共有する。テンプレートの中で `.env` を無視しないと、開発用の平文の `.env` がこのリポジトリの未追跡のファイルに出る

## 2026-11-24 web を機能ごとのディレクトリで構成し、取得と更新を TanStack Query で書く
- 決定: akitoki(#63, #72, #73, #74)に合わせ、サンプルの todo を `app/features/todo/` に移す。`app/domain` はなくし、純関数は機能の `utils/` と `app/utils/` に置く。境界の規則は akitoki の eslint-plugin-boundaries の設定をそのまま使う
- 決定: 自作のコードの自動 import を止め(`components.dirs: []`・`imports.scan: false`)、使うファイルが import する。import 文が無いと、境界の規則で依存を検査できないため
- 決定: 取得と更新は TanStack Query で書き、生成するクライアントを hey-api の axios 版と `@tanstack/vue-query` プラグインにする。更新の失敗は `Result` で返さず、`onError` でトーストを出す。web の依存から neverthrow を外し、`docs/workflow.md` の採用済みのスタックに TanStack Query と axios を加える
- 決定: 取得し直しに失敗しても、前に取得した一覧を表示し続ける。読み込めなかった案内は、最初の取得に失敗して一覧が無いときだけ出す
- 要確認: 確認中に、DB を止めると API のプロセスも落ちると分かった。`pg.Pool` に `error` の listener が無く、DB が接続を切ったときの `error` イベントが未処理の例外になる。akitoki も同じ作りで、今回の取り込みの範囲外なので直していない

## 2026-11-24 作ったプロジェクトの判断の記録を ADR にし、E2E と infra の取り込みを見送る
- 決定: 開発者の指示により、作ったプロジェクトの判断の記録を `docs/decisions.md` から `docs/adr/` の ADR(adrs で管理)に移す。規則は akitoki の `docs/workflow.md` の「判断の記録」「未確認の判断の確認」を写し、lefthook と CI(`lint-adr`)で `adrs doctor --warnings-as-errors` を実行する。ADR 1 と、ADR を使う判断の ADR 2 をテンプレートに置く
- 決定: このリポジトリ(テンプレートの保守)の判断は、引き続きルートの `docs/decisions.md` に書く。書式はこのファイルの冒頭に書いた
- 決定: 開発者の指示により、akitoki のブラウザの E2E(`e2e`・`@e2e-dev/web` による AI エージェント型)は取り込まない
- 決定: 開発者の指示により、infra の PR の cdk diff・deploy.yml・デプロイ用のロールの制限は取り込まない。テンプレートの `AppStack` が空で、akitoki の仕組みは akitoki の構成(EC2・CloudFront・ECR)を前提にしているため
- 決定: akitoki の `pnpm-workspace.yaml` の `minimumReleaseAge` は取り込まない。いまの lockfile の 33 件(公開から 3 日経っていない TanStack Query・textlint など)が違反し、install が失敗するため

## 2026-11-25 依存の版を akitoki にそろえ、vue-tsc を 3.3.13 に固定する
- 決定: 開発者の指示により、両方にある依存の指定を akitoki の版にそろえる。Node は 26.13.1(`devEngines` と API の Dockerfile)、pnpm は 12.21.0 にする。CLI 自身の `engines` は変えない(作ったプロジェクトの Node は `devEngines` で pnpm が取得するため)
- 決定: `@tanstack/vue-query` と `@tanstack/eslint-plugin-query` は、akitoki の `~5.108.0` に下げず、template の `~5.108.3` のままにする
- 決定: akitoki(#177)と同じく `vue-tsc` を `3.3.13` に固定し、Renovate の `allowedVersions` を `<3.3.14` にする。3.3.14 には、ref でない変数にもテンプレートの中で `.value` を足して型付けする不具合(vuejs/language-tools#6364)がある。作ったプロジェクトでも、同じ書き方をすると型検査に失敗する。直った版が出たら、規則を消して `~` に戻す
- 決定: web の `Result` 型、API の `UrlBuilder`、`useMutationProgress` と `withSetup` は取り込まない。akitoki でも、特定の機能(調整リンクのフォーム、Google Calendar の gateway、設定画面の保存の表示)からだけ使っており、template に使う場所が無い
