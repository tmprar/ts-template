import globals from 'globals'
import tseslint from 'typescript-eslint'

import sharedConfig from './eslint.shared.mjs'

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'template/', 'eslint.config.mjs', 'eslint.shared.mjs'],
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
