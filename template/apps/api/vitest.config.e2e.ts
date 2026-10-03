import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '#app': fileURLToPath(new URL('src', import.meta.url)),
      '#test': fileURLToPath(new URL('test', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // testcontainersでDBを起動し、マイグレーション適用済みテンプレートDBを作る
    globalSetup: ['./test/setup/global-setup.ts'],
    // コンテナ起動を含むため余裕を持たせる
    hookTimeout: 120_000,
    include: ['test/features/**/*.spec.ts', 'test/platform/**/*.spec.ts'],
    root: './',
    // workerごとにテンプレートから専用DBを複製し、各テスト前にTRUNCATEする
    setupFiles: ['./test/setup/setup-db.ts'],
  },
})
