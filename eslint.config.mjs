/*
  ひな形の共有設定をそのまま使う。プラグインと eslint 本体は template/ の依存から読むので、
  先に `pnpm --dir template install` を済ませておく(CLI の devDependencies には入れない。
  `npx github:` は devDependencies まで入れてからビルドするので、入れるとその分だけ起動が遅くなる)
*/
import sharedConfig from './template/packages/eslint-config/index.mjs'

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'template/', 'eslint.config.mjs'],
  },
  ...sharedConfig.configs['recommended'],
  ...sharedConfig.configs['recommended/ts'],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // node:test の describe / it が返す Promise はテストランナーが待つ
    files: ['src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
]
