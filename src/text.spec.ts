import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  replaceProjectName,
  stripTemplateBlocks,
  suggestProjectName,
  toNameVariants,
  validateProjectName,
} from './text.js'

describe('toNameVariants', () => {
  it('1語の名前', () => {
    expect(toNameVariants('shop')).toEqual({
      kebab: 'shop',
      pascal: 'Shop',
      upperSnake: 'SHOP',
    })
  })

  it('ハイフンで区切った名前', () => {
    expect(toNameVariants('my-shop-2')).toEqual({
      kebab: 'my-shop-2',
      pascal: 'MyShop2',
      upperSnake: 'MY_SHOP_2',
    })
  })
})

describe('validateProjectName', () => {
  it.each(['shop', 'my-shop', 'shop2', 'a-1-b'])('%s は使える', (name) => {
    expect(validateProjectName(name)).toBeUndefined()
  })

  it('空は使えない', () => {
    expect(validateProjectName('')).toBe('プロジェクト名を入力してください')
  })

  it('長すぎる名前は使えない', () => {
    expect(validateProjectName('a'.repeat(31)))
      .toBe('プロジェクト名は30文字以内にしてください')
  })

  it.each([
    'Shop',
    '2shop',
    'my_shop',
    'my--shop',
    '-shop',
    'shop-',
    '@scope/shop',
    'my shop',
  ])('%s は使えない', (name) => {
    expect(validateProjectName(name)).toBe(
      'プロジェクト名は英小文字で始め、英小文字・数字・ハイフンだけにしてください(例: my-app)',
    )
  })
})

describe('suggestProjectName', () => {
  it.each([
    ['my-app', 'my-app'],
    ['My App', 'my-app'],
    ['my_shop.v2', 'my-shop-v2'],
    ['2024-shop', 'shop'],
    ['shop--', 'shop'],
  ])('%s から %s を作る', (directoryName, expected) => {
    expect(suggestProjectName(directoryName)).toBe(expected)
  })

  it('30文字に切り詰め、末尾のハイフンを落とす', () => {
    expect(suggestProjectName(`${'a'.repeat(29)}-b`)).toBe('a'.repeat(29))
  })

  it('英字を含まなければ作れない', () => {
    expect(suggestProjectName('2024')).toBeUndefined()
  })
})

describe('replaceProjectName', () => {
  const variants = toNameVariants('my-shop')

  it('表記ごとに対応する形へ置き換える', () => {
    expect(replaceProjectName(
      '@myapp/api MyAppProd MYAPP_OPS_BUCKET /myapp/prod',
      variants,
    )).toBe('@my-shop/api MyShopProd MY_SHOP_OPS_BUCKET /my-shop/prod')
  })

  it('新しい名前がプレースホルダを含んでいても二重に置き換えない', () => {
    expect(replaceProjectName('@myapp/api MyAppProd', toNameVariants('myapp-next')))
      .toBe('@myapp-next/api MyappNextProd')
  })

  it('プレースホルダがなければそのまま返す', () => {
    expect(replaceProjectName('pnpm install', variants)).toBe('pnpm install')
  })
})

describe('stripTemplateBlocks', () => {
  it('印と中身をまとめて消す(Markdown と YAML の両方の印)', () => {
    expect(stripTemplateBlocks([
      '# README',
      '<!-- template:start -->',
      'テンプレートの説明',
      '<!-- template:end -->',
      'jobs:',
      '  # template:start',
      '  release: {}',
      '  # template:end',
      '  check: {}',
    ].join('\n'))).toBe([
      '# README',
      'jobs:',
      '  check: {}',
    ].join('\n'))
  })

  it('印がなければそのまま返す', () => {
    expect(stripTemplateBlocks('# README\n<!-- other:start -->\n')).toBe('# README\n<!-- other:start -->\n')
  })
})
