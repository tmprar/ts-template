/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  // 型エラーになるミュータントは、テストを実行する前に除く。テストの実行より型検査のほうが短い時間で終わるため
  checkers: ['typescript'],
  // テストの名前の一覧は端末に出さない。HTML のレポートに同じ内容があり、端末では Survived の一覧がスクロールで画面の外に出て読めなくなるため
  clearTextReporter: {
    logTests: false,
    reportTests: false,
  },
  /*
    前回の結果(reports/stryker-incremental.json)を読み、変更のあったコードとテストに関わるミュータントだけを実行し直す。
    モジュールの読み込み時に評価されるコード(定数の定義など)のミュータントは、テストを変えても実行し直されない。
    Stryker は、どのテストがそのミュータントを実行するかを記録できず、テストの変更と結び付けられないためである。
    テストを変えたあとは `pnpm test:mutation -- --force` で全ミュータントを実行し直す
  */
  incremental: true,
  /*
    対象は純関数(domain と shared)だけにする。domain より上の層は結合テストで検証しており、
    結合テストは testcontainers の PostgreSQL を起動するため、ミュータントごとに実行し直すと時間がかかりすぎる
  */
  mutate: ['src/modules/**/*.domain.ts', 'src/shared/**/*.ts', '!src/**/*.spec.ts'],
  // プラグインは名前で列挙する。既定の探索は @stryker-mutator/core の隣のディレクトリを見るが、pnpm は依存を
  // パッケージごとに別のディレクトリへ置くため、既定の探索ではプラグインが見つからない
  plugins: ['@stryker-mutator/vitest-runner', '@stryker-mutator/typescript-checker'],
  reporters: ['html', 'json', 'clear-text', 'progress'],
  testRunner: 'vitest',
  /*
    スコアが break を下回ると、終了コードが 1 になり、CI が失敗する。break を 100 にしない。動作が変わらない
    ミュータントはどのテストでも検出できず、無効化のコメントも書かないため、Survived のまま残る
  */
  thresholds: {
    break: 95,
    high: 80,
    low: 60,
  },
  tsconfigFile: 'tsconfig.json',
  vitest: { configFile: 'vitest.config.ts' },
}
