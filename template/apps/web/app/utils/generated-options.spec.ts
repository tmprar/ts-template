import { asMutationOptions } from '~/utils/generated-options'

describe('asMutationOptions', () => {
  it('設定がオブジェクトなら、同じオブジェクトを返す', () => {
    const options = { mutationFn: async () => await Promise.resolve('saved') }

    expect(asMutationOptions(options)).toBe(options)
  })

  it('設定が関数なら、例外を投げる', () => {
    expect(() => asMutationOptions(() => ({ mutationFn: async () => await Promise.resolve('saved') })))
      .toThrow(new TypeError('生成されたmutationの設定が関数になっている。useMutationへスプレッドできない'))
  })
})
