import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  removeLockfileImporter,
  replaceProjectName,
  stripMarkedBlocks,
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

describe('stripMarkedBlocks', () => {
  const text = [
    '# README',
    '<!-- infra:start -->',
    '配備の説明',
    '<!-- infra:end -->',
    'jobs:',
    '  # infra:start',
    '  cdk-diff: {}',
    '  # infra:end',
    '  check: {}',
  ].join('\n')

  it('remove は印と中身をまとめて消す', () => {
    expect(stripMarkedBlocks(text, 'infra', 'remove')).toBe([
      '# README',
      'jobs:',
      '  check: {}',
    ].join('\n'))
  })

  it('unwrap は印の行だけを消す', () => {
    expect(stripMarkedBlocks(text, 'infra', 'unwrap')).toBe([
      '# README',
      '配備の説明',
      'jobs:',
      '  cdk-diff: {}',
      '  check: {}',
    ].join('\n'))
  })

  it('別の印には触れない', () => {
    expect(stripMarkedBlocks(text, 'template', 'remove')).toBe(text)
  })
})

describe('removeLockfileImporter', () => {
  const lockfile = [
    'importers:',
    '',
    '  .:',
    '    devDependencies:',
    '      turbo:',
    '        specifier: ~2.10.12',
    '',
    '  apps/infra:',
    '    dependencies:',
    '      aws-cdk-lib:',
    '        specifier: ~2.0.0',
    '',
    '  packages/contracts:',
    '    dependencies:',
    '      valibot:',
    '        specifier: ~1.2.0',
    '',
    'packages:',
    '',
    '  valibot@1.2.0:',
    '    resolution: {integrity: sha512-x}',
    '',
  ].join('\n')

  it('途中の importer を取り除く', () => {
    expect(removeLockfileImporter(lockfile, 'apps/infra')).toBe([
      'importers:',
      '',
      '  .:',
      '    devDependencies:',
      '      turbo:',
      '        specifier: ~2.10.12',
      '',
      '  packages/contracts:',
      '    dependencies:',
      '      valibot:',
      '        specifier: ~1.2.0',
      '',
      'packages:',
      '',
      '  valibot@1.2.0:',
      '    resolution: {integrity: sha512-x}',
      '',
    ].join('\n'))
  })

  it('最後の importer を取り除く(次の節の手前で止まる)', () => {
    expect(removeLockfileImporter(lockfile, 'packages/contracts')).toBe([
      'importers:',
      '',
      '  .:',
      '    devDependencies:',
      '      turbo:',
      '        specifier: ~2.10.12',
      '',
      '  apps/infra:',
      '    dependencies:',
      '      aws-cdk-lib:',
      '        specifier: ~2.0.0',
      '',
      'packages:',
      '',
      '  valibot@1.2.0:',
      '    resolution: {integrity: sha512-x}',
      '',
    ].join('\n'))
  })

  it('ファイルの終わりまで続く importer も取り除く', () => {
    expect(removeLockfileImporter('importers:\n\n  apps/infra:\n    dependencies: {}\n', 'apps/infra'))
      .toBe('importers:\n')
  })

  it('該当する importer がなければそのまま返す', () => {
    expect(removeLockfileImporter(lockfile, 'apps/unknown')).toBe(lockfile)
  })
})
