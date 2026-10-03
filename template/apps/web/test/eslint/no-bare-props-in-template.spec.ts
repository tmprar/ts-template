import { ESLint } from 'eslint'
import { fileURLToPath } from 'node:url'

/**
 * 自作ルールの検査。
 *
 * ルール単体ではなくプロジェクトの設定ごと走らせる。
 * このルールは型情報を前提にしており、parserとprojectServiceの
 * 配線まで含めて初めて意味を持つため
 */

const RULE = 'local/no-bare-props-in-template'

const cwd = fileURLToPath(new URL('../..', import.meta.url))

// フィクスチャはlintの対象外にしているため、ここでは無視の設定を外して読む
const eslint = new ESLint({
  cwd,
  ignore: false,
})

const messagesOf = async (fixture: string) => {
  const [result] = await eslint.lintFiles([`test/eslint/fixtures/${fixture}`])

  return (result?.messages ?? []).filter(message => message.ruleId === RULE)
}

describe('local/no-bare-props-in-template', () => {
  it('インラインの型リテラルで宣言したpropの直接参照を報告する', async () => {
    const messages = await messagesOf('TypeLiteral.vue')

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain('\'props.label\'')
  })

  it('型参照で宣言したpropの直接参照も報告する', async () => {
    const messages = await messagesOf('TypeReference.vue')

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain('\'props.title\'')
  })

  it('v-forのローカル変数はpropと同じ名前でも報告しない', async () => {
    expect(await messagesOf('ShadowedByVFor.vue')).toHaveLength(0)
  })
})
