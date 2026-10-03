import { fixupPluginRules } from '@eslint/compat'
import sharedConfig from '@myapp/eslint-config'
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
        FCISの層をそのまま要素として定義する。
        Functional Core(utils・domain)は純粋関数、Imperative Shell(api・composables・
        pages・plugins)がI/Oと状態、View(components・layouts)は描画に徹する
      */
      ['boundaries/elements']: [
        { pattern: 'app/utils', type: 'utils' },
        { pattern: 'app/domain', type: 'domain' },
        { pattern: 'app/composables', type: 'composables' },
        { pattern: 'app/components', type: 'components' },
        { pattern: 'app/layouts', type: 'layouts' },
        { pattern: 'app/pages', type: 'pages' },
        { pattern: 'app/plugins', type: 'plugins' },
        { pattern: 'app/generated', type: 'generated' },
      ],
      ['boundaries/ignore']: ['**/node_modules/**'],
      /*
        ルートのtsconfigはreferencesだけでpathsを持たない。
        ~/* の解決先はNuxtが生成するtsconfig.app.jsonにあるため、そちらを見せる。
        解決できないとboundariesが依存先の層を判定できず、黙って素通りする
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
          default: 'allow',
          policies: [
            /*
              Functional Coreは外側へ依存しない。utilsはどこにも、domainはutilsだけに依存する。
              ここを守ることで、状態やI/Oを持たない部分をそのままテストできる
            */
            {
              disallow: {
                to: {
                  element: [
                    { type: 'composables' },
                    { type: 'components' },
                    { type: 'layouts' },
                    { type: 'pages' },
                    { type: 'plugins' },
                    { type: 'generated' },
                    { type: 'domain' },
                  ],
                },
              },
              from: {
                element: { type: 'utils' },
              },
            },
            {
              disallow: {
                to: {
                  element: [
                    { type: 'composables' },
                    { type: 'components' },
                    { type: 'layouts' },
                    { type: 'pages' },
                    { type: 'plugins' },
                    { type: 'generated' },
                  ],
                },
              },
              from: {
                element: { type: 'domain' },
              },
            },
            /*
              生成されたクライアントを呼ぶのはcomposablesとpluginsだけ。
              CoreとViewはI/Oを持たず、pagesは取得をcomposablesに任せる
            */
            {
              disallow: {
                to: {
                  element: { type: 'generated' },
                },
              },
              from: {
                element: [
                  { type: 'utils' },
                  { type: 'domain' },
                  { type: 'components' },
                  { type: 'layouts' },
                  { type: 'pages' },
                ],
              },
            },
            // Viewは描画に徹する。状態やI/Oを持つ層には依存しない
            {
              disallow: {
                to: {
                  element: [{ type: 'pages' }, { type: 'plugins' }],
                },
              },
              from: {
                element: { type: 'components' },
              },
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
      画面が必要とする形はdomainが構造的に宣言し、APIの戻り値は推論で受ける。
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
                'APIの生成型は使わない。必要な形はapp/domainで構造的に宣言し、APIの戻り値は推論で受ける',
            },
          ],
        },
      ],
    },
  },
  {
    // composablesはNuxtの慣習に合わせてcamelCase(useFoo.ts)とする
    files: ['app/composables/**/*.ts'],
    rules: {
      ['unicorn/filename-case']: [
        'error',
        {
          cases: {
            camelCase: true,
            kebabCase: false,
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
    // ESLintの設定そのもの。tsconfigの外にあり型情報を要するルールを当てられない
    'eslint.config.mjs',
    'eslint-rules/',
    // 自作ルールの検査用。わざと規約に反した書き方をしている
    'test/eslint/fixtures/',
  ],
})
