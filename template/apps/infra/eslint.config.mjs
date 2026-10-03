import sharedConfig from '@myapp/eslint-config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['cdk.out/', 'node_modules/', 'eslint.config.mjs'],
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
    // CDK の書き方と衝突するルール。個別の eslint-disable は書かず、ここで無効にする
    rules: {
      // コンストラクトは new した副作用でリソースを定義する書き方が正
      ['no-new']: 'off',
    },
  },
)
