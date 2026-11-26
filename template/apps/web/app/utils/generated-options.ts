/**
 * `options`(生成された`…Mutation()`の戻り値)がオブジェクトであれば、そのまま返す。関数であれば例外を投げる。
 * 戻り値は、useMutationの引数へスプレッドして使う。
 *
 * `…Mutation()`の戻り値をこの関数に通さずにスプレッドすると、ESLintのルール
 * `@typescript-eslint/no-misused-spread`のエラーになる。このルールは、関数でありうる型の値をスプレッドした箇所を
 * エラーにする。生成されたコードは、戻り値の型をvue-queryの`UseMutationOptions`で宣言しており、この型は
 * 「設定のオブジェクト」と「設定を返す関数」の共用体である。生成されたコードが実際に返すのは常にオブジェクトだが、
 * ルールは宣言された型で判定するため、エラーになる。
 *
 * ルールを無効にする方法は採らない。無効にすると、関数の呼び出しを書き忘れたスプレッド(`...build`)も
 * エラーにならなくなる。
 *
 * 関数であれば例外を投げるのは、関数をスプレッドしても何も展開されないためである。例外を投げずに返すと、
 * `mutationFn`を持たない設定がuseMutationに渡り、更新を実行した時点で失敗する
 */
export const asMutationOptions = <T extends object>(options: (() => T) | T): T => {
  if (typeof options === 'function') {
    throw new TypeError('生成されたmutationの設定が関数になっている。useMutationへスプレッドできない')
  }

  return options
}
