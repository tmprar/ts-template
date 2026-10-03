import { fixupPluginRules } from '@eslint/compat'
import sharedConfig from '@myapp/eslint-config'
import boundaries from 'eslint-plugin-boundaries'
import importX from 'eslint-plugin-import-x'
import nodePlugin from 'eslint-plugin-n'
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const NO_THROW = {
  message: 'controllerとworker以外では例外を投げずResult(neverthrow)で返す',
  selector: 'ThrowStatement',
}

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
      // NestJSの@Module等、デコレータ付きの空クラスは許可
      ['@typescript-eslint/no-extraneous-class']: ['error', { allowWithDecorator: true }],
      // perfectionist/sort-classesのautofix(privateメソッドを末尾に配置)と
      // 要求順が矛盾しprivateメソッドを書けなくなるため無効化
      ['unicorn/consistent-class-member-order']: 'off',
      // valibotスキーマ定義はネストが深くなるため無効化
      ['unicorn/max-nested-calls']: 'off',
      // Res・Env等はプロジェクト規約の命名のため無効化
      ['unicorn/name-replacements']: 'off',
      // createXxxSchema等のスキーマ命名規約と衝突するため無効化
      ['unicorn/no-non-function-verb-prefix']: 'off',
    },
  },
  {
    plugins: {
      // ESLint 10で削除されたcontext.getCwdを使うためfixupで互換化
      ['no-relative-import-paths']: fixupPluginRules(noRelativeImportPaths),
    },
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: {
      ['import-x']: importX,
      n: nodePlugin,
    },
    rules: {
      /*
        テスト用のpackage(vitest・supertest・@nestjs/testing等)を実装から使わせない。
        package名を並べる代わりにpackage.jsonのdevDependenciesを見る
      */
      ['import-x/no-extraneous-dependencies']: [
        'error',
        {
          devDependencies: ['**/*.spec.ts', 'test/**/*.ts'],
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
    },
  },
  {
    // 環境変数はenv.schema.tsに足しAppConfigService経由で参照する(testは起動時の設定で使う)
    files: ['src/**/*.ts'],
    rules: {
      ['n/no-process-env']: 'error',
    },
  },
  {
    // instrument.tsはNestより先に走るため、ここだけenv.schemaで検証してprocess.envを読む
    files: ['src/instrument.ts'],
    rules: {
      ['n/no-process-env']: 'off',
    },
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: {
      boundaries,
    },
    settings: {
      // modules/(ドメイン)とplatform/(技術基盤)はディレクトリ単位で1要素、
      // db(テーブル定義)・shared/kernel(共有カーネル)・shared/lib(汎用の道具)はそれぞれ1要素、
      // それ以外(src直下・test)はまとめて1要素
      ['boundaries/elements']: [
        { pattern: 'src/db', type: 'db' },
        { pattern: 'src/shared/kernel', type: 'kernel' },
        { pattern: 'src/shared/lib', type: 'lib' },
        { capture: ['moduleName'], pattern: 'src/modules/*', type: 'module' },
        { capture: ['moduleName'], pattern: 'src/platform/*', type: 'platform' },
        { pattern: 'src', type: 'app' },
        { pattern: 'test', type: 'test' },
      ],
      /*
        モジュール内の役割。要素(modules/・platform/)とは独立の次元として分類し、
        役割どうしの呼び出しの向きを boundaries/dependencies のポリシーで表す
      */
      ['boundaries/files']: [
        { category: 'domain', pattern: '**/*.domain.ts' },
        { category: 'controller', pattern: '**/*.controller.ts' },
        { category: 'facade', pattern: '**/*.facade.ts' },
        { category: 'usecase', pattern: '**/*.usecase.ts' },
        { category: 'query', pattern: '**/*.query.ts' },
        { category: 'repository', pattern: '**/*.repository.ts' },
        { category: 'gateway', pattern: '**/*.gateway.ts' },
        { category: 'queue', pattern: '**/*.queue.ts' },
        { category: 'worker', pattern: '**/*.worker.ts' },
      ],
      // node_modules内の偶然の src/modules/* パス一致を要素扱いしない
      ['boundaries/ignore']: ['**/node_modules/**'],
      ['import/resolver']: {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // モジュール外部からはindex.tsのみimport可(Public API境界)
      ['boundaries/dependencies']: [
        'error',
        {
          // 要素の中(モジュール内の役割どうし)も判定の対象にする
          checkInternals: true,
          default: 'allow',
          policies: [
            {
              disallow: {
                to: {
                  element: {
                    fileInternalPath: '!index.ts',
                    type: ['module', 'platform'],
                  },
                },
              },
            },
            // dbはテーブル定義だけを持つため、他のどこにも依存しない
            {
              disallow: {
                to: {
                  element: [
                    { type: 'module' },
                    { type: 'platform' },
                    { type: 'kernel' },
                    { type: 'lib' },
                    { type: 'app' },
                    { type: 'test' },
                  ],
                },
              },
              from: {
                element: {
                  type: 'db',
                },
              },
            },
            // 共有カーネルは業務の語彙を持つが、どのコンテキストにも属さない。
            // 汎用の道具(shared/lib)だけは使える
            {
              disallow: {
                to: {
                  element: [
                    { type: 'module' },
                    { type: 'platform' },
                    { type: 'db' },
                    { type: 'app' },
                    { type: 'test' },
                  ],
                },
              },
              from: {
                element: {
                  type: 'kernel',
                },
              },
            },
            // platformは技術基盤のため、ドメイン(modules)・src直下・testへの依存を禁止
            {
              disallow: {
                to: {
                  element: [{ type: 'module' }, { type: 'app' }, { type: 'test' }],
                },
              },
              from: {
                element: {
                  type: 'platform',
                },
              },
            },
            // テストはoverrideProviderでのモック等で内部シンボルが必要なため境界を適用しない
            {
              allow: {
                to: {
                  element: {
                    type: ['module', 'platform'],
                  },
                },
              },
              from: {
                element: {
                  type: 'test',
                },
              },
            },
            // 汎用の道具(shared/lib)は業務の意味を持たない。共有カーネルを含め外へは依存しない
            // (kernelへの依存を禁じるのは、汎用の道具に業務の語彙が滲むのを止めるため)
            {
              disallow: {
                to: {
                  element: [
                    { type: 'module' },
                    { type: 'platform' },
                    { type: 'db' },
                    { type: 'kernel' },
                    { type: 'app' },
                    { type: 'test' },
                  ],
                },
              },
              from: {
                element: {
                  type: 'lib',
                },
              },
            },
            {
              disallow: {
                to: { element: [{ type: 'module' }, { type: 'platform' }, { type: 'db' }] },
              },
              from: { file: { categories: 'domain' } },
              message: 'domain は他のモジュール・技術基盤・テーブル定義に依存しない',
            },
            /*
              モジュールの中では直接importしてよい(Public APIの境界はモジュールの外向き)。
              後ろのポリシーが優先されるため、役割どうしの向きはこの許可より後に置く
            */
            {
              allow: { dependency: { relationship: { from: 'internal' } } },
            },
            /*
              モジュール内の階層:
              facade・controller・worker → usecase → query・repository・gateway → domain
            */
            {
              disallow: {
                to: {
                  file: {
                    categories: {
                      anyOf: [
                        'controller',
                        'facade',
                        'usecase',
                        'query',
                        'repository',
                        'gateway',
                        'worker',
                        'queue',
                      ],
                    },
                  },
                },
              },
              from: { file: { categories: 'domain' } },
              message: 'domain は最下層。モジュール内のほかの役割に依存しない',
            },
            {
              disallow: {
                to: {
                  file: {
                    categories: {
                      anyOf: [
                        'controller',
                        'facade',
                        'usecase',
                        'query',
                        'repository',
                        'gateway',
                        'worker',
                        'queue',
                      ],
                    },
                  },
                },
              },
              from: { file: { categories: { anyOf: ['query', 'repository', 'gateway'] } } },
              message: 'query・repository・gateway は usecase から呼ばれる側。依存してよいのは domain だけ',
            },
            {
              disallow: {
                to: {
                  file: {
                    categories: { anyOf: ['controller', 'facade', 'worker'] },
                  },
                },
              },
              from: { file: { categories: 'usecase' } },
              message: 'usecase は query・repository・gateway・queue・domain を呼ぶ(上の層へは依存しない)',
            },
            {
              disallow: {
                to: {
                  file: {
                    categories: {
                      anyOf: [
                        'controller',
                        'facade',
                        'worker',
                        'query',
                        'repository',
                        'gateway',
                        'queue',
                        'domain',
                      ],
                    },
                  },
                },
              },
              from: { file: { categories: { anyOf: ['controller', 'facade'] } } },
              message: 'controller・facade は usecase だけを呼ぶ',
            },
            // 投入口は実行するハンドラ(worker)にも業務の層にも依存しない
            {
              disallow: {
                to: {
                  file: {
                    categories: {
                      anyOf: [
                        'worker',
                        'controller',
                        'facade',
                        'usecase',
                        'query',
                        'repository',
                        'gateway',
                      ],
                    },
                  },
                },
              },
              from: { file: { categories: 'queue' } },
              message: 'queue はジョブの投入口。ハンドラ(worker)にも業務の層にも依存しない',
            },
            // workerはジョブの実行口。usecaseを呼び、失敗はthrowする(購読するキューの名前だけqueueから得る)
            {
              disallow: {
                to: {
                  file: {
                    categories: {
                      anyOf: ['controller', 'facade', 'query', 'repository', 'gateway', 'domain'],
                    },
                  },
                },
              },
              from: { file: { categories: 'worker' } },
              message: 'worker は usecase を呼ぶ',
            },
            /*
              テーブル定義に触れるのは永続化に関わる役割だけに限る。
              platform/drizzle(接続)とtestは役割の分類を持たないため、このポリシーの対象外
            */
            {
              disallow: { to: { element: { type: 'db' } } },
              from: {
                file: {
                  categories: {
                    anyOf: ['controller', 'facade', 'usecase', 'gateway', 'queue', 'worker', 'domain'],
                  },
                },
              },
              message: 'テーブル定義を参照するのは repository・query だけ',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      ['no-relative-import-paths/no-relative-import-paths']: [
        'error',
        {
          allowSameFolder: false,
          prefix: '#app',
          rootDir: 'src',
        },
      ],
    },
  },
  {
    /*
      domain が依存できない外部package。ここだけ boundaries に寄せていないのは、
      boundaries で外部packageを見るには checkAllOrigins が必要で、
      node_modules 内の src を含むパスが要素(app)として誤分類されるため
    */
    files: ['src/modules/**/*.domain.ts'],
    rules: {
      ['no-restricted-imports']: [
        'error',
        {
          patterns: [
            {
              group: [
                '@myapp/contracts',
                '@nestjs-cls/*',
                '@nestjs/*',
                'drizzle-orm',
                'nestjs-pino',
                'valibot',
              ],
              message: 'domain は Nest・ORM・入出力の形式(contracts・valibot)に依存しない',
            },
          ],
        },
      ],
    },
  },
  {
    // モジュールの中の既定。例外のある役割だけを後ろで上書きする
    files: ['src/modules/**/*.ts'],
    rules: {
      // 型のキャストで検証を素通りさせない(`as const` はこのルールの対象外)
      ['@typescript-eslint/consistent-type-assertions']: ['error', { assertionStyle: 'never' }],
      ['no-restricted-syntax']: ['error', NO_THROW],
    },
  },
  {
    /*
      controllerは例外でHTTPのレスポンスを決め、workerはResultをthrowへ戻す
      (pg-bossのリトライに委ねる)ためthrowを許す。guardもNestの契約が例外
    */
    files: [
      'src/modules/**/*.controller.ts',
      'src/modules/**/*.worker.ts',
      'src/modules/*/*.guard.ts',
    ],
    rules: {
      ['no-restricted-syntax']: 'off',
    },
  },
  {
    // specはvitestをimportし、フィクスチャでthrowもするため書き方の制限は外す
    files: ['src/**/*.spec.ts'],
    rules: {
      ['no-restricted-syntax']: 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      ['no-relative-import-paths/no-relative-import-paths']: [
        'error',
        {
          allowSameFolder: false,
          prefix: '#test',
          rootDir: 'test',
        },
      ],
    },
  },
)
