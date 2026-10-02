import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      /*
        純関数(text.ts)だけを対象にする。対話(cli.ts)とファイル操作(template.ts)は
        生成したプロジェクトを実際に動かして確かめる
      */
      include: ['src/text.ts'],
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    include: ['src/**/*.spec.ts'],
  },
})
