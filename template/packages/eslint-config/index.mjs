import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import importNewlines from 'eslint-plugin-import-newlines'
import jsdoc from 'eslint-plugin-jsdoc'
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
    plugins: {
      jsdoc,
    },
    rules: {
      ['jsdoc/check-alignment']: 'error',
      ['jsdoc/require-asterisk-prefix']: 'error',
      ['jsdoc/require-jsdoc']: [
        'error',
        {
          // コンストラクタは対象にしない。引数を受け取ってインスタンスを作るという動作は、クラスの名前と引数の型から読める
          checkConstructors: false,
          /*
            アロー関数と関数式は、require ではなく contexts で、変数に代入したものだけを対象にする。
            require の ArrowFunctionExpression・FunctionExpression を true にすると、オブジェクトのプロパティに書いた
            コールバック(useMutation の onSuccess、FullCalendar の dateClick)も対象になる。
            コールバックとして渡す無名関数は、規約で JSDoc の対象外にしている
          */
          contexts: [
            'TSMethodSignature',
            'VariableDeclarator > ArrowFunctionExpression',
            'VariableDeclarator > FunctionExpression',
          ],
          // 不足を検出したときに空の JSDoc を挿入させない。lint は --fix 付きで実行するため、挿入させると空の JSDoc が付いて検査を通る
          enableFixer: false,
          require: {
            ArrowFunctionExpression: false,
            FunctionDeclaration: true,
            FunctionExpression: false,
            MethodDefinition: true,
          },
        },
      ],
    },
  },
  {
    rules: {
      ['array-callback-return']: 'error',
      ['block-scoped-var']: 'error',
      ['curly']: ['error', 'multi-line', 'consistent'],
      ['default-case']: 'error',
      ['default-case-last']: 'error',
      ['default-param-last']: 'error',
      ['func-style']: ['error', 'declaration', { allowArrowFunctions: true }],
      ['guard-for-in']: 'error',
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
      // アロー関数を、外側のスコープへ移さずに関数の内部で定義したい場合もあるので、無効にする
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
      /*
        propsはVueの用語であり略語ではない。このルールがpropsをpropertiesへ修正すると、
        vue/require-macro-variable-nameがpropsという名前を要求するため衝突する
      */
      ['unicorn/name-replacements']: [
        'error',
        { replacements: { props: false } },
      ],
      // 配列ではないオブジェクトの、配列のメソッドと同じ名前のメソッド(map など)の呼び出しも誤って検出するため、無効にする
      ['unicorn/no-array-callback-reference']: 'off',
      ['unicorn/no-array-method-this-argument']: 'off',
      ['unicorn/no-array-reduce']: 'off',
      /*
        このルールに従うと、awaitの結果に名前を付けるためだけの変数が増えるなど、利点が小さい。
        一律に書き換えるべき箇所ではないため、無効にする
      */
      ['unicorn/no-await-expression-member']: 'off',
      // JSDoc は各行を * で始める形にそろえるため、逆の形を求めるこのルールを無効にする
      ['unicorn/no-asterisk-prefix-in-documentation-comments']: 'off',
      ['unicorn/no-null']: 'off',
      ['unicorn/no-unnecessary-parameters']: 'off',
      /*
        このルールは () => Promise.resolve(x) をasync関数へ修正するが、awaitを含まないasync関数は
        @typescript-eslint/require-awaitがエラーにするため、2つのルールが衝突する。
        このルールは書き方を統一するだけで、require-awaitはawaitの書き忘れという実際の誤りを
        検出するため、このルールのほうを無効にする
      */
      ['unicorn/no-useless-promise-resolve-reject']: 'off',
      ['unicorn/no-process-exit']: 'off',
      ['unicorn/numeric-separators-style']: 'off',
      ['unicorn/prefer-top-level-await']: 'off',
      /*
        このルールは、早期 return の if と後続の return も三項演算子の 1 文にまとめさせる。
        条件の多いガード節が 1 つの式に詰め込まれて読みにくくなるため、無効にする
      */
      ['unicorn/prefer-ternary']: 'off',
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
      ['@stylistic/list-style']: [
        'error',
        {
          overrides: {
            ['{}']: { singleLine: { spacing: 'always' } },
            ['ExportNamedDeclaration']: { singleLine: { maxItems: 1 } },
            ['ImportDeclaration']: { singleLine: { maxItems: 1 } },
            ['ObjectExpression']: { singleLine: { maxItems: 1 } },
            ['TSInterfaceBody']: { singleLine: { maxItems: 1 } },
            ['TSTypeLiteral']: { singleLine: { maxItems: 1 } },
          },
          singleLine: { spacing: 'never' },
        },
      ],
      ['@stylistic/no-extra-parens']: 'error',
      ['@stylistic/no-extra-semi']: 'error',
      ['@stylistic/no-floating-decimal']: 'error',
      ['@stylistic/no-multi-spaces']: 'error',
      ['@stylistic/no-multiple-empty-lines']: [
        'error',
        {
          max: 1,
          ['maxEOF']: 1,
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
