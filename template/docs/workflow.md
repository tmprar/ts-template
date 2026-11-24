# 作業の進め方

開発は主に自律実行で進める。人間の確認を待たずに作業を続けられるよう、次のルールに従う。

## 進め方

- 指示された範囲だけを実装する。範囲外の変更や先回りの実装はしない
- 要件 ID の順に 1 つずつ進め、1 要件ごとに「実装 → 検証 → コミット」を完了させてから次へ移る
- 確認を待たずに進める。判断が必要な場面では `docs/requirements.md` と `CLAUDE.md` に沿って決め、`docs/adr/` の ADR に記録する(「判断の記録」)
- エージェントが自分で下した判断は、未確認の判断として Status を Proposed にした ADR に記録し、確認を待たずに実装する。push する前に、そのブランチで足した・変えた Proposed の ADR を人間に示して確認を依頼する。人間は、Accepted にするか改める(「未確認の判断の確認」)
- 要件定義書で決められない重要な判断(仕様の解釈が大きく分かれる、要件同士が矛盾する等)は、実装を止めずに最も無難な案で進め、その ADR の Consequences に「要確認」として残す

## 検証(証拠を出力に残す)

完了の判定は会話に出た出力だけで行われる。「できたはず」ではなく、必ずコマンドを実行して結果を示す。

- 各コミット前に `pnpm lint` と `pnpm typecheck` を実行し、終了コード 0 を示す
- API を変えたら `pnpm test`(純関数の単体)と `pnpm test:integration` を実行して結果を示す。振る舞いを変えたなら、その観点のテストコードを足してから通す
- web を変えたら `pnpm test` と `pnpm build` を実行して結果を示す
- 見た目を変えたら、`pnpm dev` で起動した画面を Playwright(MCP)で開いて確認する。デザインカンプを `docs/design/` に
  置いている場合は、それと突き合わせる。確認した画面・幅・配色は出力に残す
  - 幅は PC 1280 / タブレット 640 / スマートフォン 430、配色はライト・ダークの両方を見る
  - 差分があれば直して再確認する。人間に見てもらう前提で残さない
- DB スキーマを変えたら `pnpm db generate` でマイグレーションを生成し、`drizzle/` に出たファイルを示す
- 最後に `git status` を実行し、クリーンであることを示す
- エラーが出たら原因を直して再実行する。検証を省略したりテストを弱めたりして通さない

## 依存パッケージ

- 採用済みのスタック(NestJS / Drizzle / valibot / pg-boss / neverthrow / Nuxt / Nuxt UI / TanStack Query / axios / vitest)とその公式の周辺パッケージは追加してよい
- それ以外は追加しない。必要と判断したら Status が Proposed の ADR に提案として理由を残し、既存の手段で実装する。Decision には、依存を導入していないことを書く
- バージョン指定は `~` を付ける(`pnpm-workspace.yaml` の `savePrefix`)

## コミットとドキュメント

- ブランチ名は `<type>/<kebab-case>` にする(例: `feat/todo-due-date`、`fix/todo-title-length`)。
  `type` はコミットの prefix と同じ `feat` / `fix` / `refactor` / `test` / `docs` / `chore`。
  lefthook の `pre-push` で検査する
- PR は squash マージで main に取り込む。PR の title がそのまま main のコミットメッセージになるので、
  title もコミットメッセージと同じ書式(`<prefix>: <日本語の常体>(要件 ID)`)にする
- ブランチは main から切る。別の PR に依存する変更は、その PR のマージを待って main から切り直す。
  先行 PR のブランチから派生させると、先行 PR の squash 後に同じファイルが別履歴になり衝突する。
  どうしても切り離せないなら 1 つの PR にまとめる
- squash マージ後のローカルブランチは `git branch -d` が「未マージ」として拒否する。
  main に内容が入っていることを確認して `git branch -D` で消す
- コミットは要件単位。メッセージは日本語の常体で、`feat: todoに期限を設定できるようにする(TODO-6)` のように要件 ID を含める。メッセージは lefthook の `commit-msg` で commitlint が検査する(設定は `commitlint.config.mjs`)
- 完了した要件は `docs/requirements.md` の「状況」列を実装済みに更新する
- 仕様の変更や判断が生じたら `docs/requirements.md` を更新し、判断を `docs/adr/` の ADR に記録する
- セットアップやコマンドが変わったら、`CLAUDE.md` と `README.md` の該当節も更新する

### prefix の選び方

「どのファイルを触ったか」ではなく「利用者から見て何が変わるか」で選ぶ。

| prefix | 使う場面 |
| --- | --- |
| `feat` | 利用者が見る・使う内容が変わる(機能追加、画面に出る文言の変更) |
| `fix` | 動作の不具合を直す |
| `refactor` | 振る舞いを変えずに構造を整える |
| `test` | テストの追加・再編 |
| `docs` | `docs/` 配下・`CLAUDE.md`・`README.md` の変更 |
| `chore` | ビルド・CI・依存の更新など、利用者に見えない保守 |

- ソースコード中の文字列でも、画面や meta 情報に出るなら `docs` ではなく `feat`
- バグ修正でないものに `fix` は使わない

## 判断の記録

開発に関わる意思決定は、すべて `docs/adr/` の ADR に記録する。構成、技術や依存の選定、規約、データや API の形に限らず、画面の仕様と見た目(デザインカンプへの追従で決めたこと、カンプと異なるままにすること)、テスト、デプロイと運用、障害への対処で決めたことも対象にする。

ADR は [adrs](https://github.com/joshrotenberg/adrs) の CLI(または MCP サーバー)で作る。置き場所は `.adr-dir` が指す `docs/adr/`、形式は Nygard(Context / Decision / Consequences)で、採用しなかった案は Decision の子見出し Alternatives に書く。

```bash
adrs new "<タイトル>"                        # エージェントが下した判断と、導入が決まっていない提案(Status は Proposed)
adrs new --status Accepted "<タイトル>"      # 人間が指示した判断と、人間が確認した判断
adrs new --status Accepted -s 12 "<タイトル>" # ADR 12 の決定全体を改める(ADR 12 は Superseded になる)
adrs new --status Accepted -l "12:Amends:Amended by" "<タイトル>" # ADR 12 の決定の一部を改める(ADR 12 は Accepted のまま)
adrs doctor --warnings-as-errors             # 番号の重複、リンク切れ、空の節の検査(CI と同じ条件)
```

```markdown
# 12. todo の件名の上限を 100 文字にする

Date: 2026-10-10

## Status

Accepted

## Context

判断が必要になった状況と、制約。

## Decision

- 決めたことと、それを選んだ理由

### Alternatives

- 不採用: 採用しなかった案。採用しなかった理由
- 保留: 条件がそろってから判断する案。判断に必要な条件

## Consequences

- この判断によって生じる制約と、残る課題
- 要確認: 資料を読み突き合わせても決められず、人間の判断が要る点
```

- 1 つの ADR には 1 つの主題を書く。タイトルは、判断の内容が分かる日本語の文にする(「〜を〜にする」)。
  同じ画面や同じ部品についての細かい判断は、1 つの ADR にまとめてよい
- 他の選択肢を検討したうえで決めた判断には、必ず Decision の中に子見出し `### Alternatives` を置き、採用しなかった案と、採用しなかった理由を書く。採用した案を選んだ理由は Decision に書き、Alternatives には書かない。
  一度採用してから取り消した案も、不採用として経緯と理由を書く。
  検討していない案を、あとから作って並べない。選択肢が無かった判断(指示やカンプのとおりにしたもの)には、節を置かない
- 本文の文章は、`CLAUDE.md` の「文章」に従って書く
- 理由には、そうなる仕組みを書く(「重いため」ではなく、何がどの条件で問題になるのか)。指示で決まった判断にも、指示した人が挙げた理由を書く。
  理由が示されていないときは、誰が何を決めたのかを書く(「開発者が、〜を削ると決めた」)
- 「要確認」に書くのは、資料を読み突き合わせても決められず、人間の判断が要る点だけにする。
  カンプとの一致は自分でブラウザを見て判断し、確認した画面の一覧を依頼として残さない
- Status は、判断を誰が下したかで決める。エージェントが自分で下した判断は、実装したものも Proposed にする。人間が指示した判断(依頼の文や、レビューの指摘で決まったもの)は Accepted にする。エージェントが既存の判断を `-s` で改めるときも、新しい ADR は Proposed にする
- 節の見出し(`## Status` / `## Context` / `## Decision` / `### Alternatives` / `## Consequences`)は、adrs が解析するため英語のままにする。本文は日本語で書く
- 判断を改めるときは、元の ADR の本文を書き換えず、新しい ADR を作る。決定全体を改めるときは `-s` で置き換える。決定の一部だけを改めるときは、`-l "番号:Amends:Amended by"` で関連付け、元の ADR の残りの決定を効力のあるまま残す。同じ ADR に Amends が重なり、いまの決定を複数の ADR から組み立てないと読めなくなったときは、いまの決定を 1 つの ADR にまとめて `-s` で置き換える。判断の内容を変えずに、文章を `CLAUDE.md` の「文章」に合わせて直すだけなら、元の ADR の本文を書き換えてよい
- コードコメントから参照するときは、`docs/adr/0035` のように番号までのパスで書く
- `adrs doctor --warnings-as-errors` は、ADR を含むコミットのときに lefthook が、PR では CI(`ci.yml` の `lint-adr`)が実行する。本文に `describe` という単語か `...` があると、adrs がその節をテンプレートのままと判定して警告を出すため、別の書き方にする

## 未確認の判断の確認

Status が Proposed の ADR は、人間がまだ確認していない判断である。エージェントは確認を待たずに実装を続けるが、Proposed の ADR を含むブランチは push しない。push する前に、ブランチで足した・変えた Proposed の ADR を人間に示して確認を依頼し、人間が Accepted にするか改める。`git push` の前のフック(`.claude/hooks/review.sh`)は、ブランチで足した・変えた ADR に Status が Proposed のものがあれば、push を止める。

```bash
adrs list -s proposed -l   # 未確認の判断の一覧
adrs status <番号> accepted # 判断を認める
```

- 判断を認めるときは、`adrs status <番号> accepted` にする。依存の提案を認めたときは、導入を別の作業として指示する。認めない依存の提案は `adrs status <番号> rejected` にする
- 判断を改めるときは、改めた内容を指示する。エージェントは、指示に従って `-s` で元の ADR を置き換える Accepted の ADR を作り、実装を直す
- Consequences の「要確認」は、Proposed の ADR の中でも、エージェントが特に人間の判断を求める点を示す。確認するときは「要確認」のある ADR から読む
