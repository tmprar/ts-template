import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const appDirectory = fileURLToPath(new URL('app', import.meta.url))

/**
 * 環境をファイル単位で分ける。
 * Nuxt環境はファイルごとにアプリを起動するため、それを必要としない
 * Functional Coreまで載せると実行時間が跳ね上がる
 */
export default defineConfig(async () => ({
  test: {
    coverage: {
      /*
        Functional Coreだけを対象にする。ShellとViewは単体テストの対象外なので
        含めると全体の数字が薄まり、Coreの取りこぼしが見えなくなる
      */
      exclude: ['**/*.spec.ts'],
      include: ['app/domain/**/*.ts', 'app/utils/**/*.ts'],
      provider: 'v8' as const,
      // json-summary / json は CI の PR コメント(vitest-coverage-report-action)が読む
      reporter: ['text', 'html', 'json-summary', 'json'],
      /*
        Coreは純粋関数だけなので、到達できない分岐が残らない限り全て覆える。
        下回ったらテストの取りこぼしとみなす
      */
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    projects: [
      {
        // 純粋関数。ref・自動import・I/Oを持たないのでNuxtは要らない
        resolve: { alias: { '~': appDirectory } },
        test: {
          environment: 'node',
          globals: true,
          include: ['app/{domain,utils}/**/*.spec.ts'],
          name: 'core',
        },
      },
      {
        // ESLintの自作ルール。ESLintを起動するだけなのでNuxtは要らない
        test: {
          environment: 'node',
          globals: true,
          include: ['test/eslint/**/*.spec.ts'],
          name: 'eslint',
          // ESLintがプロジェクト全体の型情報を読むため既定では足りない
          testTimeout: 60_000,
        },
      },
      // composablesとcomponents。useStateや自動importにNuxtの実行環境が要る
      await defineVitestProject({
        test: {
          environment: 'nuxt',
          exclude: ['test/eslint/**'],
          globals: true,
          include: ['test/**/*.spec.ts'],
          name: 'nuxt',
        },
      }),
    ],
  },
}))
