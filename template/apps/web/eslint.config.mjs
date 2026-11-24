import { fixupPluginRules } from '@eslint/compat'
import sharedConfig from '@myapp/eslint-config'
import pluginQuery from '@tanstack/eslint-plugin-query'
import boundaries from 'eslint-plugin-boundaries'
import globals from 'globals'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'
import noBarePropsInTemplate from './eslint-rules/no-bare-props-in-template.mjs'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'
import withNuxt from './.nuxt/eslint.config.mjs'

// Nuxtが提供するエイリアスとディレクトリの対応。相対importの代わりにこれらを使わせる
const importAliases = [
  {
    prefix: '~',
    rootDir: 'app',
  },
  {
    prefix: '#shared',
    rootDir: 'shared',
  },
  {
    prefix: '#server',
    rootDir: 'server',
  },
]

export default withNuxt(
  ...sharedConfig.configs['recommended'],
  ...sharedConfig.configs['recommended/ts'],
  ...pluginQuery.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // .vueは外側をvue-eslint-parser、<script>内をtypescript-eslintに担当させる。
    // recommended/tsがparserを全体に設定するため、上書きするようこの位置に置く
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        extraFileExtensions: ['.vue'],
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Vueコンポーネントの慣習に合わせてPascalCaseを許可する
      ['unicorn/filename-case']: [
        'error',
        {
          cases: {
            camelCase: false,
            kebabCase: true,
            pascalCase: true,
            snakeCase: false,
          },
          multipleFileExtensions: false,
        },
      ],
    },
  },
  {
    plugins: {
      boundaries,
    },
    settings: {
      /*
        app をほかの要素より前には置かない。boundaries は先に一致した要素を採用するため、
        前に置くと全ファイルが app になる
      */
      ['boundaries/elements']: [
        { capture: ['featureName'], pattern: 'app/features/*', type: 'feature' },
        { pattern: 'app/generated', type: 'generated' },
        { pattern: 'app/utils', type: 'utils' },
        { pattern: 'app/composables', type: 'composables' },
        { pattern: 'app/components', type: 'components' },
        { pattern: 'app', type: 'app' },
        { pattern: 'test', type: 'test' },
      ],
      ['boundaries/files']: [
        { category: 'component', pattern: 'app/features/*/components/**' },
        { category: 'composable', pattern: 'app/features/*/composables/**' },
        { category: 'utils', pattern: 'app/features/*/utils/**' },
      ],
      ['boundaries/ignore']: ['**/node_modules/**'],
      /*
        resolverにはルートのtsconfigではなくtsconfig.app.jsonを指定する。
        ルートのtsconfigはreferencesだけでpathsを持たず、~/* の解決先はNuxtが生成するtsconfig.app.jsonにある。
        ~/* を解決できないとboundariesが依存先の要素を判定できず、違反があっても報告しない
      */
      ['import/resolver']: {
        typescript: {
          alwaysTryTypes: true,
          project: './.nuxt/tsconfig.app.json',
        },
      },
    },
    rules: {
      ['boundaries/dependencies']: [
        'error',
        {
          checkInternals: true,
          default: 'allow',
          policies: [
            {
              disallow: {
                to: {
                  element: [
                    { type: 'feature' },
                    { type: 'composables' },
                    { type: 'components' },
                    { type: 'generated' },
                    { type: 'app' },
                    { type: 'test' },
                  ],
                },
              },
              from: {
                element: {
                  type: 'utils',
                },
              },
            },
            {
              disallow: {
                to: {
                  element: [
                    { type: 'feature' },
                    { type: 'components' },
                    { type: 'app' },
                    { type: 'test' },
                  ],
                },
              },
              from: {
                element: {
                  type: 'composables',
                },
              },
            },
            {
              disallow: {
                to: {
                  element: [
                    { type: 'feature' },
                    { type: 'composables' },
                    { type: 'generated' },
                    { type: 'app' },
                    { type: 'test' },
                  ],
                },
              },
              from: {
                element: {
                  type: 'components',
                },
              },
            },
            {
              disallow: {
                to: {
                  element: [{ type: 'app' }, { type: 'test' }],
                },
              },
              from: {
                element: {
                  type: 'feature',
                },
              },
            },
            {
              disallow: {
                to: {
                  element: {
                    fileInternalPath: '!index.ts',
                    type: 'feature',
                  },
                },
              },
              message: '機能の外からは index.ts だけを import する',
            },
            {
              disallow: {
                to: {
                  element: {
                    captured: { featureName: '!{{ from.element.captured.featureName }}' },
                    type: 'feature',
                  },
                },
              },
              from: {
                element: {
                  type: 'feature',
                },
              },
              message: '機能は別の機能に依存しない(機能の組み合わせは app/pages のルートで行う)',
            },
            // テストの対象は機能の中の1つのコンポーネントやcomposableであるため、テストにはPublic APIの境界を適用しない
            {
              allow: {
                to: {
                  element: {
                    type: 'feature',
                  },
                },
              },
              from: {
                element: {
                  type: 'test',
                },
              },
            },
            {
              disallow: {
                to: {
                  element: [
                    { type: 'composables' },
                    { type: 'components' },
                    { type: 'generated' },
                    { type: 'app' },
                  ],
                },
              },
              from: { file: { categories: 'utils' } },
              message: '機能の utils は composable・コンポーネント・API の生成物に依存しない',
            },
            /*
              この許可(同じ機能の中のファイルどうしのimport)を、役割どうしの依存の向きを決めるポリシーより後には置かない。
              boundariesは後ろに書いたポリシーを優先するため
            */
            {
              allow: { dependency: { relationship: { from: 'internal' } } },
            },
            {
              disallow: {
                to: { file: { categories: { anyOf: ['component', 'composable'] } } },
              },
              from: { file: { categories: 'utils' } },
              message: '機能の utils はいちばん下の層。上の層に依存しない',
            },
            /*
              コンポーネントがAPIを直接呼ばず、取得と更新の扱い(取得し直す対象、失敗の案内)を機能のcomposableに集めるため、
              機能のコンポーネントから生成物への依存を禁止する。appと役割の分類を持たないファイル(app/composables)は、このポリシーの対象外
            */
            {
              disallow: { to: { element: { type: 'generated' } } },
              from: { file: { categories: 'component' } },
              message: 'API の生成物を呼ぶのは composable だけ',
            },
          ],
        },
      ],
    },
  },
  {
    /*
      生成された型はどの層からも使わない。層の規則はboundariesが見るが、
      ファイル単位の禁止はこちらの方が素直に書ける。
      OpenAPI由来の型はドメインの語彙を持たず生成の都合がそのまま現れるため、
      画面が必要とする形は機能のutilsが構造的に宣言し、APIの戻り値は推論で受ける。
      生成物どうしの参照(sdk.gen→types.gen)は妨げないようapp/generatedは対象外
    */
    files: ['app/**/*.ts', 'app/**/*.vue'],
    ignores: ['app/generated/**'],
    rules: {
      ['@typescript-eslint/no-restricted-imports']: [
        'error',
        {
          patterns: [
            {
              group: ['**/generated/**/types.gen', '**/generated/**/types.gen.ts'],
              message:
                'APIの生成型は使わない。必要な形は機能のutilsで構造的に宣言し、APIの戻り値は推論で受ける',
            },
          ],
        },
      ],
    },
  },
  {
    /*
      composablesはNuxtの慣習に合わせてcamelCase(useFoo.ts)とする。
      kebab-caseも許可する。このルールはディレクトリ名も検査し、機能のディレクトリ名はkebab-caseである
    */
    files: ['app/composables/*.ts', 'app/features/*/composables/*.ts'],
    rules: {
      ['unicorn/filename-case']: [
        'error',
        {
          cases: {
            camelCase: true,
            kebabCase: true,
            pascalCase: false,
            snakeCase: false,
          },
          multipleFileExtensions: false,
        },
      ],
    },
  },
  {
    // @nuxt/eslintはstandaloneでないためvueプラグイン自体は提供されない。ここで登録してルールを設定する
    files: ['**/*.vue'],
    plugins: {
      vue: pluginVue,
    },
    rules: {
      ['vue/attributes-order']: ['error', {
        alphabetical: true,
        order: [
          'DEFINITION',
          'LIST_RENDERING',
          'CONDITIONALS',
          'RENDER_MODIFIERS',
          'GLOBAL',
          ['UNIQUE', 'SLOT'],
          'TWO_WAY_BINDING',
          'OTHER_DIRECTIVES',
          'OTHER_ATTR',
          'EVENTS',
          'CONTENT',
        ],
      }],
      ['vue/block-lang']: [
        'error',
        {
          script: {
            lang: 'ts',
          },
        },
      ],
      ['vue/block-order']: ['error', {
        order: ['script', 'template', 'style'],
      }],
      ['vue/block-tag-newline']: ['error', {
        maxEmptyLines: 0,
        multiline: 'always',
        singleline: 'always',
      }],
      ['vue/component-api-style']: ['error', ['script-setup']],
      ['vue/component-name-in-template-casing']: ['error', 'PascalCase', {}],
      ['vue/component-options-name-casing']: ['error', 'kebab-case'],
      ['vue/custom-event-name-casing']: ['error', 'camelCase', {}],
      ['vue/define-emits-declaration']: ['error', 'type-based'],
      ['vue/define-macros-order']: ['error', {
        defineExposeLast: true,
        order: ['defineProps', 'defineEmits'],
      }],
      ['vue/define-props-declaration']: ['error', 'type-based'],
      /*
        propsは分割代入せず`const props`で受け、参照は`props.x`と書く。
        分割代入するとローカルの定数と見分けが付かず、computedのコールバックの中だけで
        参照して依存の追跡から外れる事故が起きるため。
        scriptで参照しない場合は代入しない`defineProps<...>()`のままでよい
      */
      ['vue/define-props-destructuring']: ['error', { destructure: 'never' }],
      ['vue/enforce-style-attribute']: ['error', { allow: ['scoped'] }],
      ['vue/html-button-has-type']: ['error', {}],
      ['vue/html-comment-content-newline']: ['error', {
        multiline: 'always',
        singleline: 'never',
      }, {}],
      ['vue/html-comment-content-spacing']: ['error', 'always', {}],
      ['vue/html-comment-indent']: ['error', 2],
      ['vue/multi-word-component-names']: 'off',
      ['vue/no-duplicate-attr-inheritance']: ['error', {
        checkMultiRootNodes: true,
      }],
      ['vue/no-empty-component-block']: 'error',
      ['vue/no-import-compiler-macros']: 'error',
      ['vue/no-lone-template']: ['error', {
        ignoreAccessible: true,
      }],
      ['vue/no-multiple-objects-in-class']: 'error',
      ['vue/no-required-prop-with-default']: ['error', {
        autofix: true,
      }],
      ['vue/no-restricted-html-elements']: ['error'],
      ['vue/no-root-v-if']: 'error',
      /*
        `const { x } = props`と、setup直下での`const x = props.x`を禁じる。
        propsを読む位置がそのまま依存の追跡範囲になるため、
        computed・watchの中で読ませる
      */
      ['vue/no-setup-props-reactivity-loss']: 'error',
      ['vue/no-template-target-blank']: ['error', { allowReferrer: false }],
      ['vue/no-v-text']: 'error',
      ['vue/padding-line-between-blocks']: ['error', 'always'],
      ['vue/prefer-define-options']: 'error',
      ['vue/prefer-use-template-ref']: 'error',
      ['vue/require-macro-variable-name']: ['error', {
        defineEmits: 'emit',
        defineProps: 'props',
        defineSlots: 'slots',
        useAttrs: 'attrs',
        useSlots: 'slots',
      }],
      ['vue/slot-name-casing']: ['error', 'camelCase'],
      ['vue/v-bind-style']: ['error', 'shorthand', { sameNameShorthand: 'never' }],
      ['vue/v-for-delimiter-style']: ['error', 'in'],
      ['vue/v-on-event-hyphenation']: ['error', 'always', {
        autofix: true,
      }],
      ['vue/v-on-handler-style']: ['error', 'inline', {
        ignoreIncludesComment: false,
      }],
      ['vue/v-on-style']: ['error', 'shorthand'],
      ['vue/v-slot-style']: ['error', {
        atComponent: 'shorthand',
        default: 'shorthand',
        named: 'shorthand',
      }],
    },
  },
  {
    plugins: {
      // ESLint 10で削除されたcontext.getCwdを使うためfixupで互換化
      ['no-relative-import-paths']: fixupPluginRules(noRelativeImportPaths),
    },
  },
  {
    files: ['**/*.vue'],
    plugins: {
      ['local']: {
        rules: { ['no-bare-props-in-template']: noBarePropsInTemplate },
      },
    },
    rules: {
      ['local/no-bare-props-in-template']: 'error',
    },
  },
  {
    files: [
      'app/**/*.ts',
      'app/**/*.vue',
      'shared/**/*.ts',
      'server/**/*.ts',
    ],
    rules: {
      // no-relative-import-pathsはrootDir外に解決されるimport(app→shared等)を見逃すため、
      // 相対importの全面禁止をこちらで担保する。rootDir内の違反はno-relative-import-paths側が自動修正する
      ['no-restricted-imports']: [
        'error',
        {
          patterns: [
            {
              group: [
                './*',
                '../*',
              ],
              message: '相対importは禁止です。~(app) / #shared / #server のエイリアスを使ってください。',
            },
          ],
        },
      ],
    },
  },
  ...importAliases.map(({ prefix, rootDir }) => ({
    files: [`${rootDir}/**/*.ts`, `${rootDir}/**/*.vue`],
    rules: {
      ['no-relative-import-paths/no-relative-import-paths']: [
        'error',
        {
          allowSameFolder: false,
          prefix,
          rootDir,
        },
      ],
    },
  })),
).prepend({
  ignores: [
    '.nuxt/',
    // hey-apiの生成物。手で編集しないためlint対象外
    'app/generated/',
    '.output/',
    'coverage/',
    'dist/',
    'node_modules/',
    // ESLintとdependency-cruiserの設定ファイル。tsconfigの外にあり型情報を要するルールを当てられない
    'eslint.config.mjs',
    '.dependency-cruiser.mjs',
    'eslint-rules/',
    // 自作ルールの検査用。わざと規約に反した書き方をしている
    'test/eslint/fixtures/',
  ],
})
