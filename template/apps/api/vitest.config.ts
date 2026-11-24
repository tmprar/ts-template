import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import {
  defineConfig,
  type TestProjectConfiguration,
} from 'vitest/config'

import { TEST_ENV } from './test/fixtures/env.js'

/*
  全体のしきい値は、カバレッジが大きく下がったことを止めるために置き、実際の値との間に数ポイントの余裕を残す。
  余裕が無いと、テストの要らない分岐を 1 つ書き足しただけで失敗する。
  全体のしきい値を定数として書くのは、PR にカバレッジをコメントする vitest-coverage-report-action が、
  設定ファイルの中で最初に現れる `branches: 数字` などを全体のしきい値として読むため
*/
const globalThresholds = {
  branches: 65,
  functions: 85,
  lines: 80,
  statements: 80,
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '#app': fileURLToPath(new URL('src', import.meta.url)),
      '#test': fileURLToPath(new URL('test', import.meta.url)),
    },
  },
  test: {
    /*
      カバレッジは単体と結合を合算して測る(pnpm test:cov は両方の project を実行する)。
      純関数の層は単体で、それ以外の層は結合で通るので、片方だけでは全体を測れない
    */
    coverage: {
      // 起動処理と、DI の組み立てと型の定義だけのファイルは、テストの対象にしないので除く
      exclude: [
        '**/*.spec.ts',
        '**/index.ts',
        '**/*.module.ts',
        '**/*.types.ts',
        'src/main.ts',
        'src/instrument.ts',
        'src/db/schema.ts',
        'src/scripts/**',
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      // json-summary と json は、CI が PR にカバレッジをコメントする vitest-coverage-report-action が読む
      reporter: ['text', 'html', 'json-summary', 'json'],
      thresholds: {
        ...globalThresholds,
        // 純関数の層は、到達できない分岐が無いので 4 指標とも 100% を求める
        ...Object.fromEntries(['src/modules/**/*.domain.ts', 'src/shared/**/*.ts'].map(pattern => [pattern, {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        }])),
      },
    },
    env: TEST_ENV,
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          include: ['src/**/*.spec.ts'],
          name: 'unit',
        },
      },
      /*
        ミューテーションテスト(test:mutation が STRYKER=1 を設定する)では、結合の project を読み込まない。Stryker は
        設定ファイルのパスしか受け取らず、project を選べないので、読み込むとミュータントごとに結合テストが PostgreSQL を起動する
      */
      ...(process.env['STRYKER'] === '1'
        ? []
        : [
        // 結合テストは testcontainers の PostgreSQL を起動し、外部サービスを MSW で受ける
          {
            extends: true,
            test: {
              globalSetup: ['./test/setup/global-setup.ts'],
              // タイムアウトは既定より長くする。フックがコンテナの起動を含むため
              hookTimeout: 120_000,
              include: ['test/specs/**/*.spec.ts'],
              name: 'integration',
              // worker ごとに専用の DB を作り、各テストの前に TRUNCATE する
              setupFiles: ['./test/setup/setup-db.ts', './test/setup/msw.ts'],
            },
          },
        ] satisfies TestProjectConfiguration[]),
    ],
    root: './',
  },
})
