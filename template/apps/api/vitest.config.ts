import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '#app': fileURLToPath(new URL('src', import.meta.url)),
      '#test': fileURLToPath(new URL('test', import.meta.url)),
    },
  },
  test: {
    coverage: {
      /*
        純関数(domain と shared)だけを対象にする。それ以外の役割は e2e が担当で、
        含めると Nest 依存の I/O が分母を支配して domain の取りこぼしが見えなくなる。
        ファイル単位では並べない(移動・改名で静かに対象から外れるため、
        役割の接尾辞で指定する)
      */
      exclude: [
        '**/*.spec.ts',
        '**/index.ts',
        '**/*.module.ts',
        '**/*.types.ts',
      ],
      include: [
        'src/modules/**/*.domain.ts',
        'src/shared/**/*.ts',
      ],
      provider: 'v8',
      // json-summary / json は CI の PR コメント(vitest-coverage-report-action)が読む
      reporter: ['text', 'html', 'json-summary', 'json'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    globals: true,
    // test/ 配下の結合テストは vitest.config.e2e.ts が拾う
    include: ['src/**/*.spec.ts'],
    root: './',
  },
})
