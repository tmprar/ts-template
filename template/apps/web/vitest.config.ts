import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const appDirectory = fileURLToPath(new URL('app', import.meta.url))

// Functional Core(純関数)の置き場
const coreDirectories = ['app/utils', 'app/features/*/utils']

/*
  全体のしきい値は、カバレッジが大きく下がったことを止めるために置き、実際の値との間に数ポイントの余裕を残す。
  余裕が無いと、テストの要らない分岐を 1 つ書き足しただけで失敗する。関数のカバレッジには全体のしきい値を置かない。呼ばれた関数の中身を数えず、
  小さなコールバックの多さで値が揺れるため。
  全体のしきい値を純関数の層の 100% より前に定数として書くのは、PR にカバレッジをコメントする vitest-coverage-report-action が、
  設定ファイルの中で最初に現れる `branches: 数字` などを全体のしきい値として読むため
*/
const globalThresholds = {
  branches: 65,
  lines: 80,
  statements: 75,
}

/*
  純関数の層(coreDirectories)は、到達できない分岐が無いので 4 指標とも 100% を求める。
  4 指標をオブジェクトのリテラルで書かず、指標の名前の一覧から作るのは、vitest-coverage-report-action が設定ファイルを文字列として検索し、
  最初に現れる `functions` のキーとそれに続く数字を全体の関数のしきい値として読むため。リテラルで書くと、全体では置いていない関数のしきい値を 100% と表示する
*/
const fullCoverage = Object.fromEntries(['branches', 'functions', 'lines', 'statements'].map(metric => [metric, 100]))

/**
 * 環境をファイル単位で分ける。
 * Nuxt環境はファイルごとにアプリを起動するため、それを必要としない
 * Functional Coreまで載せると実行時間が跳ね上がる
 */
export default defineConfig(async () => ({
  test: {
    /*
      カバレッジは単体と結合(Nuxt 環境)を合算して測る(pnpm test:cov はすべての project を実行する)。
      ShellとViewは結合で通るので、単体だけでは全体を測れない
    */
    coverage: {
      // 生成した API クライアントはテストの対象にしないので除く
      exclude: ['**/*.spec.ts', 'app/generated/**'],
      include: ['app/**/*.{ts,vue}'],
      provider: 'v8' as const,
      // json-summary / json は CI の PR コメント(vitest-coverage-report-action)が読む
      reporter: ['text', 'html', 'json-summary', 'json'],
      thresholds: {
        ...globalThresholds,
        ...Object.fromEntries(coreDirectories.map(directory => [`${directory}/**/*.ts`, fullCoverage])),
      },
    },
    projects: [
      {
        // 純粋関数。ref・自動import・I/Oを持たないのでNuxtは要らない
        resolve: { alias: { '~': appDirectory } },
        test: {
          environment: 'node',
          globals: true,
          include: ['app/utils/**/*.spec.ts', 'app/features/*/utils/**/*.spec.ts'],
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
      // 画面・部品・composable。useStateや自動import、プラグインが用意するQueryClientにNuxtの実行環境が要る
      await defineVitestProject({
        test: {
          environment: 'nuxt',
          globals: true,
          // すべてのテストの前に行う Nuxt のアプリの起動は、テストを並列に実行して負荷が高いと既定の10秒を超えるため、上限を30秒にする
          hookTimeout: 30_000,
          include: ['test/nuxt/**/*.spec.ts'],
          name: 'nuxt',
          setupFiles: ['test/nuxt/setup.ts'],
        },
      }),
    ],
  },
}))
