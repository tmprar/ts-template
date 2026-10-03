/*
  template/packages/eslint-config/index.mjs の写し。CLI はひな形のファイルを読まずに lint できるよう、同じ規則を自分で持つ。
  ひな形の共有設定を変えたら、こちらも合わせる
*/
import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import importNewlines from 'eslint-plugin-import-newlines'
import perfectionist from 'eslint-plugin-perfectionist'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'

const recommended = [
  eslint.configs.recommended,
  eslintPluginUnicorn.configs['recommended'],
  perfectionist.configs['recommended-natural'],
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    rules: {
      ['array-callback-return']: 'error',
      ['block-scoped-var']: 'error',
      // ['class-methods-use-this']: 'error',
      ['curly']: ['error', 'multi-line', 'consistent'],
      ['default-case']: 'error',
      ['default-case-last']: 'error',
      ['default-param-last']: 'error',
      ['func-style']: ['error', 'declaration', { allowArrowFunctions: true }],
      ['guard-for-in']: 'error',
      // ['no-await-in-loop']: 'error',
      ['no-caller']: 'error',
      ['no-console']: ['error', { allow: ['warn', 'error'] }],
      ['no-div-regex']: 'error',
      ['no-else-return']: ['error', { allowElseIf: false }],
      ['no-eval']: 'error',
      ['no-extend-native']: 'error',
      ['no-extra-bind']: 'error',
      ['no-extra-label']: 'error',
      ['no-fallthrough']: [
        'error',
        {
          allowEmptyCase: true,
        },
      ],
      ['no-implicit-coercion']: ['error', { boolean: true }],
      ['no-implicit-globals']: 'error',
      ['no-implied-eval']: 'error',
      ['no-inner-declarations']: 'error',
      ['no-invalid-this']: 'error',
      ['no-iterator']: 'error',
      ['no-lone-blocks']: 'error',
      ['no-lonely-if']: 'error',
      ['no-multi-str']: 'error',
      ['no-new']: 'error',
      ['no-new-func']: 'error',
      ['no-new-wrappers']: 'error',
      ['no-octal-escape']: 'error',
      ['no-proto']: 'error',
      ['no-restricted-globals']: ['error', 'event', 'fdescribe'],
      ['no-script-url']: 'error',
      ['no-self-compare']: 'error',
      ['no-sequences']: ['error', { allowInParentheses: true }],
      ['no-throw-literal']: 'error',
      ['no-unmodified-loop-condition']: 'error',
      ['no-unused-expressions']: 'error',
      ['no-useless-call']: 'error',
      ['no-useless-concat']: 'error',
      ['no-useless-return']: 'error',
      ['no-var']: 'error',
      ['object-shorthand']: ['error', 'always'],
      ['perfectionist/sort-imports']: [
        'error',
        {
          fallbackSort: {
            order: 'asc',
            type: 'line-length',
          },
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      ['perfectionist/sort-object-types']: [
        'error',
        {
          fallbackSort: {
            order: 'asc',
            type: 'line-length',
          },
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      ['perfectionist/sort-objects']: [
        'error',
        {
          fallbackSort: {
            order: 'asc',
            type: 'line-length',
          },
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      ['prefer-const']: 'error',
      ['prefer-promise-reject-errors']: 'error',
      ['prefer-rest-params']: 'error',
      ['prefer-spread']: 'error',
      ['prefer-template']: 'error',
      ['radix']: 'error',
      // アロー関数を定義するスコープを内部に定義したい場合もあるので無効化
      ['unicorn/consistent-function-scoping']: 'off',
      ['unicorn/filename-case']: [
        'error',
        {
          cases: {
            camelCase: false,
            kebabCase: true,
            pascalCase: false,
            snakeCase: false,
          },
          multipleFileExtensions: false,
        },
      ],
      // arrayメソッド以外の場合でも引っかかるため無効化
      /*
        propsはVueの用語であり略語ではない。propertiesへ直されると
        vue/require-macro-variable-nameがpropsを要求するため衝突する
      */
      ['unicorn/name-replacements']: [
        'error',
        { replacements: { props: false } },
      ],
      ['unicorn/no-array-callback-reference']: 'off',
      ['unicorn/no-array-method-this-argument']: 'off',
      ['unicorn/no-array-reduce']: 'off',
      /*
        名前を付けるだけの変数が増えてしまうなど、意味が薄い。
        機械的に変更する点ではないため、無効化
      */
      ['unicorn/no-await-expression-member']: 'off',
      ['unicorn/no-null']: 'off',
      /*
        () => Promise.resolve(x) をasyncへ直すが、待つものが無いasyncは
        @typescript-eslint/require-awaitが咎めるため衝突する。
        こちらは様式のみで、require-awaitはawaitのし忘れという実際の誤りを
        捕まえるため、様式側を降ろす
      */
      ['unicorn/no-useless-promise-resolve-reject']: 'off',
      ['unicorn/no-process-exit']: 'off',
      ['unicorn/numeric-separators-style']: 'off',
      ['unicorn/prefer-top-level-await']: 'off',
      ['unicorn/prevent-abbreviations']: 'off',
      ['yoda']: 'error',
    },
  },
  {
    plugins: {
      ['@stylistic']: stylistic,
      ['import-newlines']: importNewlines,
    },
  },
  stylistic.configs.customize({
    commaDangle: 'always-multiline',
    indent: 2,
    jsx: false,
    quotes: 'single',
    semi: false,
  }),
  {
    rules: {
      ['@stylistic/array-bracket-spacing']: ['error', 'never'],
      ['@stylistic/arrow-spacing']: [
        'error',
        {
          after: true,
          before: true,
        },
      ],
      ['@stylistic/block-spacing']: ['error', 'always'],
      ['@stylistic/brace-style']: ['error', '1tbs', { allowSingleLine: true }],
      ['@stylistic/comma-spacing']: [
        'error',
        {
          after: true,
          before: false,
        },
      ],
      ['@stylistic/dot-location']: ['error', 'property'],
      ['@stylistic/eol-last']: ['error', 'always'],
      ['@stylistic/function-call-spacing']: ['error', 'never'],
      ['@stylistic/key-spacing']: [
        'error',
        {
          afterColon: true,
          beforeColon: false,
        },
      ],
      ['@stylistic/lines-around-comment']: 'off',
      ['@stylistic/no-extra-parens']: 'error',
      ['@stylistic/no-extra-semi']: 'error',
      ['@stylistic/no-floating-decimal']: 'error',
      ['@stylistic/no-multi-spaces']: 'error',
      // "@stylistic/jsx-quotes": ["error", "prefer-double"],
      ['@stylistic/no-multiple-empty-lines']: [
        'error',
        {
          max: 1,
          ['maxEOF']: 1,
        },
      ],
      ['@stylistic/object-curly-newline']: [
        'error',
        {
          ['ExportDeclaration']: {
            consistent: true,
            minProperties: 2,
            multiline: true,
          },
          // ['ObjectPattern']: {
          //   minProperties: 2,
          //   multiline: true,
          //   consistent: true,
          // },
          ['ImportDeclaration']: {
            consistent: true,
            minProperties: 2,
            multiline: true,
          },
          ['ObjectExpression']: {
            consistent: true,
            minProperties: 2,
            multiline: true,
          },
          ['TSInterfaceBody']: {
            consistent: true,
            minProperties: 2,
            multiline: true,
          },
          ['TSTypeLiteral']: {
            consistent: true,
            minProperties: 2,
            multiline: true,
          },
        },
      ],
      ['@stylistic/object-curly-spacing']: ['error', 'always'],
      ['@stylistic/object-property-newline']: [
        'error',
        {
          allowAllPropertiesOnSameLine: false,
        },
      ],
      ['@stylistic/operator-linebreak']: ['error', 'before'],
      ['@stylistic/padding-line-between-statements']: [
        'error',
        {
          blankLine: 'always',
          next: 'return',
          prev: '*',
        },
        {
          blankLine: 'always',
          next: '*',
          prev: 'if',
        },
        {
          blankLine: 'always',
          next: '*',
          prev: 'directive',
        },
        {
          blankLine: 'any',
          next: 'directive',
          prev: 'directive',
        },
        {
          blankLine: 'any',
          next: '*',
          prev: ['case', 'default'],
        },
        {
          blankLine: 'always',
          next: '*',
          prev: 'import',
        },
        {
          blankLine: 'any',
          next: 'import',
          prev: 'import',
        },
      ],
      ['@stylistic/quotes']: [
        'error',
        'single',
        { allowTemplateLiterals: 'avoidEscape' },
      ],
      ['@stylistic/space-before-blocks']: ['error', 'always'],
      ['@stylistic/space-before-function-paren']: [
        'error',
        {
          anonymous: 'always',
          asyncArrow: 'always',
          named: 'never',
        },
      ],
      ['@stylistic/space-in-parens']: ['error', 'never'],
      ['@stylistic/spaced-comment']: [
        'error',
        'always',
        {
          exceptions: ['-', '+'],
          markers: ['/'],
        },
      ],
      ['@stylistic/switch-colon-spacing']: [
        'error',
        {
          after: true,
          before: false,
        },
      ],
      ['@stylistic/template-curly-spacing']: ['error', 'never'],
      ['@stylistic/wrap-iife']: ['error', 'inside'],
      ['import-newlines/enforce']: [
        'error',
        {
          items: 1,
          semi: false,
        },
      ],
    },
  },
]

const recommendedTs = [
  ...tseslint.configs.strictTypeChecked,
  {
    rules: {
      ['@typescript-eslint/explicit-member-accessibility']: [
        'error',
        {
          accessibility: 'explicit',
          overrides: {
            constructors: 'no-public',
          },
        },
      ],
      ['@typescript-eslint/naming-convention']: [
        'error',
        {
          format: ['strictCamelCase'],
          leadingUnderscore: 'allow',
          selector: 'variable',
        },
        {
          format: ['strictCamelCase', 'UPPER_CASE', 'StrictPascalCase'],
          leadingUnderscore: 'allow',
          modifiers: ['const'],
          selector: 'variable',
        },
        {
          format: ['strictCamelCase', 'StrictPascalCase'],
          leadingUnderscore: 'allow',
          selector: 'function',
        },
        {
          format: ['strictCamelCase'],
          selector: 'accessor',
        },
        {
          format: ['strictCamelCase'],
          leadingUnderscore: 'allow',
          selector: 'parameter',
        },
        {
          format: ['StrictPascalCase'],
          selector: 'typeAlias',
        },
        {
          format: ['StrictPascalCase'],
          selector: 'class',
        },
        {
          format: ['StrictPascalCase'],
          selector: 'interface',
        },
      ],
      ['@typescript-eslint/no-deprecated']: 'warn',
      ['@typescript-eslint/no-empty-object-type']: [
        'error',
        {
          allowInterfaces: 'with-single-extends',
        },
      ],
      ['@typescript-eslint/no-generated-empty-object-type']: 'off',
      ['@typescript-eslint/no-import-type-side-effects']: 'error',
      ['@typescript-eslint/no-misused-promises']: [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
      ['@typescript-eslint/no-non-null-assertion']: 'error',
      ['@typescript-eslint/no-unnecessary-condition']: [
        'error',
        {
          allowConstantLoopConditions: true,
        },
      ],
      ['@typescript-eslint/no-unnecessary-type-parameters']: 'off',
      ['@typescript-eslint/promise-function-async']: 'error',
      ['@typescript-eslint/return-await']: ['error', 'always'],
    },
  },
]

export default {
  configs: {
    ['recommended']: recommended,
    ['recommended/ts']: recommendedTs,
  },
}
