import sharedConfig from '@myapp/eslint-config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'eslint.config.mjs'],
  },
  ...sharedConfig.configs['recommended'],
  ...sharedConfig.configs['recommended/ts'],
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // valibotスキーマ定義はネストが深くなるため無効化
      ['unicorn/max-nested-calls']: 'off',
      // createXxxSchema等のスキーマ命名規約と衝突するため無効化
      ['unicorn/no-non-function-verb-prefix']: 'off',
    },
  },
)
