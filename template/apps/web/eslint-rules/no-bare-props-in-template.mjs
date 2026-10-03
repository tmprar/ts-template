/**
 * テンプレートからpropを名前で直接参照することを禁じる。
 *
 * propsは`const props`で受け、テンプレートでも`props.x`と書かせる。
 * 素の名前で書けると、それがpropなのかscriptのローカルなのか読んで分からず、
 * 参照している位置が依存の追跡に関わることも見えなくなるため(CAL-5)
 *
 * eslint-plugin-vueのutilsは公開APIではないため使わない。
 * テンプレートの走査はvue-eslint-parser、propの型解決はtypescript-eslintが
 * parserServicesとして公開しているものだけで組む
 */
export default {
  create(context) {
    const {
      defineTemplateBodyVisitor,
      esTreeNodeToTSNodeMap,
      program,
    } = context.sourceCode.parserServices ?? {}

    // .vue以外はテンプレートを持たない
    if (defineTemplateBodyVisitor === undefined) return {}

    /*
      型情報なしではpropの名前を決められない。
      黙って見逃すと規約が効いていないことに気付けないため、設定の誤りとして知らせる
    */
    if (program === undefined || esTreeNodeToTSNodeMap === undefined) {
      throw new Error(
        'local/no-bare-props-in-template には型情報が要ります。parserOptionsのprojectServiceを有効にしてください',
      )
    }

    /** definePropsで宣言されたpropの名前。テンプレートの走査より先に集まる */
    const propNames = new Set()

    return defineTemplateBodyVisitor(
      {
        VExpressionContainer(node) {
          for (const reference of node.references) {
            // v-forやスロットが作るローカル変数は、名前が同じでもpropではない
            if (reference.variable !== null) continue

            const { name } = reference.id

            if (propNames.has(name)) {
              context.report({
                data: { name },
                messageId: 'bare',
                node: reference.id,
              })
            }
          }
        },
      },
      /*
        テンプレートの走査はscriptを読み終えてから走るため、
        ここで集めたpropNamesが揃った状態で上の走査に入る
      */
      {
        CallExpression(node) {
          if (node.callee.type !== 'Identifier' || node.callee.name !== 'defineProps') {
            return
          }

          const [typeArgument] = node.typeArguments?.params ?? []

          if (typeArgument === undefined) return

          /*
            型で解決する。インラインの型リテラルも、型参照(`defineProps<Props>()`)も、
            import した型や交差型も、同じように名前が取れる
          */
          const type = program
            .getTypeChecker()
            .getTypeAtLocation(esTreeNodeToTSNodeMap.get(typeArgument))

          for (const property of type.getProperties()) {
            propNames.add(property.name)
          }
        },
      },
    )
  },
  meta: {
    docs: {
      description: 'テンプレートではpropを素の名前ではなくprops.x経由で参照する',
    },
    messages: {
      bare: "テンプレートでは '{{name}}' ではなく 'props.{{name}}' を使ってください",
    },
    schema: [],
    type: 'problem',
  },
}
