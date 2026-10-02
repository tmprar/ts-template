import sharedConfig from '@myapp/eslint-config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'eslint.config.mjs'],
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
)
