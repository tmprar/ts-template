# レビューの観点: 規約

`CLAUDE.md` と `docs/workflow.md` の規約と、変更を突き合わせて確かめる観点。`find` の担当 `conventions` に渡す。

## 文章(すべての PR)

`CLAUDE.md` の「文章」と、そこから参照する `.claude/skills/japanese-prose/SKILL.md` の規範と突き合わせる。見るのは、PR が追加・変更した行の文章(コードコメントと JSDoc、`docs/` 配下の文書、`README.md`、`CLAUDE.md`、ADR)と、PR の title と本文。
画面とメールに出す文言は見ない。規範を 2 か所に書くと片方だけが更新されて内容が食い違うので、観点の項目はこのファイルに写さない。

## API の構成(`apps/api/src/modules/**` を変えた PR)

`CLAUDE.md` の「API のモジュール構成」と突き合わせる。

- ファイルの置き場所と名前が規約どおりになっている。同じ役割のファイルが複数あるときは、役割の名前のディレクトリにまとまっている
- Controller の I/F が `packages/contracts` で定義され、Facade・Usecase・QueryService の DTO がそれぞれのファイルの中に定義されている
- Usecase の呼び出しと戻り値の整形が、Controller・Facade・Usecase の内部にインラインで書かれている(整形のための関数や別ファイルを作っていない)
- Usecase が Repository に渡す値を Entity の `create` で作り、Repository が DB から受け取った値を Entity の `from` で Entity にして返している
- Repository・Gateway の interface と、その失敗の型が Domain に定義され、Usecase が interface で DI している
- Entity の部分更新が `apply` メソッドで実装され、失敗の型が `Apply○○ChangesError` になっている。項目ごとの `change○○` メソッドを作っていない
- Repository・Gateway の実装クラスの名前が「実装の手段 + interface の名前」で、ファイル名がクラス名に合っている
- 書き込みのメソッド名が操作に合っている(INSERT は `add○○`、UPDATE だけは `update○○`、upsert は `save○○`)。
  メソッドの実装を読み、名前と実際の SQL が一致しているかを確かめる
- 条件で絞る Repository のメソッド名が「動詞 + 対象 + `By` + 条件」になっている
- DTO の名前が、読む側が受け取るデータの中身で付いている
- メールのテンプレートなど、コード以外のファイルがモジュール直下の `assets/` にある
- Worker が Usecase を呼び、エラーを throw している

## API の失敗とログ(`apps/api/src/**` を変えた PR)

- `Result` の失敗の型がメソッドごとに定義され、`type` で見分ける判別共用体になっている。そのメソッドで起こらない失敗が並んでいない
- 例外を catch して `Result` の失敗を返す箇所と、下の層の失敗を包み直す箇所で、`cause` を引き継いでいる
- ログを出しているのが Controller と Worker だけになっている。Usecase・QueryService・Repository・Gateway がログを出していない
- Controller が投げる例外に `code`(大文字のスネークケース)と `message` を渡している
- 例外の `code` を追加・変更したときは、次の 3 つが一致している
  - Controller が投げる `code`
  - そのエンドポイントの `@ApiErrorResponse` に並べた `code`
  - 結合テストの `expectErrorCode`(`apps/api/test/specs/` を `code` の文字列で検索して確かめる)
- 環境変数を追加したときは、`apps/api/src/platform/config/env.schema.ts` に追加され、`AppConfigService` 経由で参照されている
- ルートを追加したときは、`/api` 接頭辞の下にある

## コメントと JSDoc(コメントを含むファイルを変えた PR)

`CLAUDE.md` の「コードコメント」と突き合わせる。JSDoc の有無は ESLint が検査するので、中身だけを見る。YAML・シェルスクリプト・CSS・設定ファイルのコメントも対象にする。

- コメントが、特殊な書き方をしている箇所(一般的な書き方や既定の設定から外している、読んだ人が直したくなる形にしている)にだけ置かれている
- コメント・テストの題名・API の説明の文字列に、要件 ID・ADR の番号・画面 ID だけの参照が無い。コメントアウトしたコードと、参照先の URL だけのコメントが無い
- 関数とメソッドの JSDoc の 1 文目が、呼び出す側から見た動作(What)になっている。処理の手順を書いていない
- コードコメントが Why と Why not だけを書いている。コードや名前を読めば分かること、区切りや手順の説明を書いていない
- Why が、コードが変わらない限り成り立つ理由になっている。変更の経緯(何が問題で、何をどう変えたか)をコメントに書いていない
- Why not が、実際に選べる方法と、採らない理由を書いている。目的や事実の説明を否定形に言い換えただけのものがない
- 関数以外の宣言の JSDoc が、名前と型の言い換えになっていない
- controller のメソッドの JSDoc(1 行目と `@remarks`)が、API の利用者向けに書かれている
- コメントが書いている内容が、実際のコードの動作と一致している

## web(`apps/web/**` を変えた PR)

`CLAUDE.md` の「web の構成」と突き合わせる。

- API の取得と更新が composable の中の TanStack Query で書かれている。`useAsyncData` を使っていない
- `queryKey` と取得・更新の関数を手で書かず、生成された `…Options()` / `…Mutation()` を使っている。
  `…Mutation()` の戻り値をスプレッドするときに `asMutationOptions` を通している
- 更新の失敗を `useMutation` のオプションの `onError` で受けてトーストで伝え、接続の失敗を `error.response` の有無で見分け、原因を `error.response.data.code` で分けている。HTTP ステータスや `message` で分岐していない
- 更新の失敗の案内の文言を `onError` の中で決め、`useNotify` の `error` でトーストに表示している。取得の失敗を画面に残す案内は、`error` から `computed` で導き、`ref` に代入していない
- 更新のあとに取得し直す取得を `useMutation` の `meta.invalidates` に書いている(`onSettled` などで `invalidateQueries` を直接呼んでいない)
- composable が `mutate` を操作の名前で返し、画面に固有の後処理を、画面が `mutate` の第 2 引数のコールバックに書いている
- 機能の composable が、API を呼ぶかどうかを問わず `composables/` に、純粋関数と型が `utils/` に置かれている
- 複数の機能を使う処理が `app/pages/` のルートに書かれている。機能の composable が別の機能の値を使うときは、ルートが引数で渡している
- 機能の `index.ts` が、機能の外で使うものだけを export している
- 複数の機能が使い、どの機能にも属さないコードだけが、`app/components/`・`app/composables/`・`app/utils/` に置かれている
- `app/generated/api/` を手で編集していない。API の入出力を変えた PR では、生成物が同じ PR で更新されている
- 見た目に関わる変更の PR の本文に、確認した画面・幅(1280 / 640 / 430)・配色(ライト・ダーク)が書かれている

## テスト(テストか、振る舞いを変えた PR)

`CLAUDE.md` の「テスト」と突き合わせる。

- 振る舞いを変えた PR に、その観点のテストが追加されている。既存のテストの期待値を緩めたり、テストを削除したりして通していない
- API のテストが、エンドポイントの結合テストと純関数の単体だけになっている。サービスのモック単体を書いていない
- 単体が、domain・`src/shared/`・SDK を通す gateway の純関数に書かれ、戻り値全体を 1 回の `toEqual` でリテラルと照合している
- カバレッジのしきい値を、テストを足さずに下げていない。差分のカバレッジが基準を下回るときは、テストを足すか、テストで通せない理由が PR の本文に書かれている
- エンドポイントの結合テストが 1 エンドポイント 1 ファイルで `test/specs/api/<リソース>/<操作>.spec.ts` にあり、`describe('<メソッド> <パス>')` → `describe('<条件>のとき')` → `it('<外から見える結果>')` の 3 階層になっている。it の中に説明のコメントを置いていない
- 投入するエンドポイントの無いジョブ(定期実行など)の結合テストは、ジョブごとに 1 ファイルで `test/specs/jobs/` にあり、エンドポイントが投入するジョブの振る舞いは、そのエンドポイントのファイルで確かめている
- エンドポイントを追加・変更した PR で、そのエンドポイントのファイルが、正常系・入力の形式・業務の規則・404・副作用を確かめている
- 前提のデータを `test/factories/` の factory で作り、検証の対象のエンドポイントだけを HTTP で呼んでいる
- 成功の応答の本文を `parseBody` で contracts の schema と照合して読み、失敗の応答の `code` を `expectErrorCode` で確かめている
- `fetch` で通信する外部サービスを MSW(`test/mocks/`)で受け、外へ出た要求を `test/mocks/` の関数から読んでいる。DI で差し替えているのが、HTTP の層で受けられない外部サービスの gateway とジョブキューだけになっている。`toHaveBeenCalledWith` を書いていない
- ジョブの結果を、`ctx.jobs.drain()` のあとに確かめている。`vi.waitFor` でジョブの完了を待っていない
- DB を直接読んで確かめているのが、応答からも外へ出た要求からも見分けられないものに限られている
- 形式だけの 400 が「入力の形式が不正なとき」の `it.each` にまとまっている。業務の制約の結合テストが代表 1 本に絞られ、domain の単体が網羅している
- `test/` の共有コードに足した関数が、役割のディレクトリ(`factories/`・`helpers/`・`mocks/`・`fixtures/`)の、操作する対象のファイルにあり、「動詞 + 対象」の名前になっている
- web のテストが、純関数・汎用の部品・ロジックの厚い composable の単体と、画面単位の結合テストの 2 層になっている。composable を単独で呼ぶ spec、機能の部品の単体、Tailwind の class 名を確かめるテストを足していない
- web の Nuxt 環境で動かすテストが `test/nuxt/` にあり、画面の spec が `app/pages/<パス>.vue` に対応する `test/nuxt/specs/pages/<パス>.spec.ts` に、部品と composable の spec が実装と同じファイル名で置かれている
- web の画面の spec が、先頭で `setupMockApi()` を呼び、API の応答を `test/nuxt/mocks/handlers/` の関数か `server.use` で足している。要求の中身や回数を記録せず、応答を受けた画面の表示・トースト・遷移を確かめている
- web の画面の spec が、デバウンスや最低表示時間のような時間で決まる振る舞いを、実時間で待たずに `vi.advanceTimersByTimeAsync` で時計を進めて確かめている。`vi.waitFor` の上限を延ばしていない
- web の画面の spec が、起きないこと(保存したことを表示しない、など)を `vi.waitFor` で待って確かめず、時計を進めてから 1 回だけ確かめている
- `test/nuxt/` の共有コードに足した関数が、役割のディレクトリ(`mocks/handlers/`・`factories/`・`helpers/`)の、操作する対象のファイルにある。名前は「動詞 + 対象」になっている(`serveTodos`・`rejectRequest`)。テストのフックを登録する関数に `use` で始まる名前を付けていない
