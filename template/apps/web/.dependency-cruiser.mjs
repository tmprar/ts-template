/**
 * ファイル間の循環importは、ESLintではなくdependency-cruiserのこの設定で検出する。
 * ESLintは1つのファイルの中のimportごとに検査し、複数のファイルにまたがる循環を検出できないためである。
 */
export default {
  forbidden: [
    {
      comment: 'ファイル単位の循環を禁止する',
      from: {},
      name: 'no-circular',
      severity: 'error',
      to: { circular: true },
    },
    {
      comment: '解決できないimportを禁止する。Nuxtの仮想モジュール(#で始まるもの)は対象外',
      from: {},
      name: 'not-to-unresolvable',
      severity: 'error',
      to: {
        couldNotResolve: true,
        pathNot: '^#',
      },
    },
  ],
  options: {
    // API の生成物(hey-api の出力)は解析の対象に含めない。生成物の中のファイルどうしが循環しており、手で直せないためである
    exclude: { path: '^app/generated' },
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: {
      // package.jsonのexportsで入口を公開するパッケージを解決するために、exportsFieldsとconditionNamesを指定する
      conditionNames: ['types', 'import', 'require', 'node', 'default'],
      exportsFields: ['exports'],
      extensions: ['.ts', '.vue', '.js'],
    },
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    tsPreCompilationDeps: true,
  },
}
