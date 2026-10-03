/**
 * 循環importの検出。ESLintはファイル単位でしか見られないため、
 * モジュール(src/modules/* と src/platform/*)間の循環はここで検出する。
 * https://github.com/sverweij/dependency-cruiser
 */
export default {
  forbidden: [
    {
      comment:
        'モジュール間の循環を禁止する。依存の向きは設計判断としてレビューで見るが、'
        + '循環に至ったものはここで落とす',
      from: {},
      name: 'no-module-circular',
      scope: 'folder',
      severity: 'error',
      to: { circular: true },
    },
    {
      comment:
        'domainは表現形式に依存しない。ワイヤー形式(contracts)や'
        + '外部APIの形式への変換はdomainの外(controller・gateway)に置く',
      from: { path: 'src/modules/.+\\.domain\\.ts$' },
      name: 'no-format-in-domain',
      severity: 'error',
      to: { path: '@myapp/contracts|packages/contracts' },
    },
    {
      comment: 'ファイル単位の循環も禁止する(モジュール内を含む)',
      from: {},
      name: 'no-circular',
      severity: 'error',
      to: { circular: true },
    },
  ],
  options: {
    // ビルド成果物は解析対象外(#app/*のdefault条件が指すため、除外しないと二重に辿る)
    exclude: { path: '^dist' },
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: {
      // #app/*はtypes条件がsrc、default条件がdistを指す。
      // ソース同士の依存を見たいのでtypesを優先する
      conditionNames: ['types', 'import', 'require', 'node', 'default'],
      extensions: ['.ts', '.js'],
    },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
}
