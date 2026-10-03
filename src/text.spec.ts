import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  removeLockfileImporter,
  replaceProjectName,
  stripMarkedBlocks,
  suggestProjectName,
  toNameVariants,
  validateProjectName,
} from './text.ts'

describe('toNameVariants', () => {
  it('1語の名前', () => {
    assert.deepEqual(toNameVariants('shop'), {
      kebab: 'shop',
      pascal: 'Shop',
      upperSnake: 'SHOP',
    })
  })

  it('ハイフンで区切った名前', () => {
    assert.deepEqual(toNameVariants('my-shop-2'), {
      kebab: 'my-shop-2',
      pascal: 'MyShop2',
      upperSnake: 'MY_SHOP_2',
    })
  })
})

describe('validateProjectName', () => {
  for (const name of ['shop', 'my-shop', 'shop2', 'a-1-b']) {
    it(`${name} は使える`, () => {
      assert.equal(validateProjectName(name), undefined)
    })
  }

  it('空は使えない', () => {
    assert.equal(validateProjectName(''), 'プロジェクト名を入力してください')
  })

  it('長すぎる名前は使えない', () => {
    assert.equal(validateProjectName('a'.repeat(31)), 'プロジェクト名は30文字以内にしてください')
  })

  for (const name of [
    'Shop',
    '2shop',
    'my_shop',
    'my--shop',
    '-shop',
    'shop-',
    '@scope/shop',
    'my shop',
  ]) {
    it(`${name} は使えない`, () => {
      assert.equal(
        validateProjectName(name),
        'プロジェクト名は英小文字で始め、英小文字・数字・ハイフンだけにしてください(例: my-app)',
      )
    })
  }
})

describe('suggestProjectName', () => {
  for (const [directoryName, expected] of [
    ['my-app', 'my-app'],
    ['My App', 'my-app'],
    ['my_shop.v2', 'my-shop-v2'],
    ['2024-shop', 'shop'],
    ['shop--', 'shop'],
  ] as const) {
    it(`${directoryName} から ${expected} を作る`, () => {
      assert.equal(suggestProjectName(directoryName), expected)
    })
  }

  it('30文字に切り詰め、末尾のハイフンを落とす', () => {
    assert.equal(suggestProjectName(`${'a'.repeat(29)}-b`), 'a'.repeat(29))
  })

  it('英字を含まなければ作れない', () => {
    assert.equal(suggestProjectName('2024'), undefined)
  })
})

describe('replaceProjectName', () => {
  const variants = toNameVariants('my-shop')

  it('表記ごとに対応する形へ置き換える', () => {
    assert.equal(
      replaceProjectName('@myapp/api MyAppProd MYAPP_OPS_BUCKET /myapp/prod', variants),
      '@my-shop/api MyShopProd MY_SHOP_OPS_BUCKET /my-shop/prod',
    )
  })

  it('新しい名前がプレースホルダを含んでいても二重に置き換えない', () => {
    assert.equal(
      replaceProjectName('@myapp/api MyAppProd', toNameVariants('myapp-next')),
      '@myapp-next/api MyappNextProd',
    )
  })

  it('プレースホルダがなければそのまま返す', () => {
    assert.equal(replaceProjectName('pnpm install', variants), 'pnpm install')
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
    assert.equal(stripMarkedBlocks(text, 'infra', 'remove'), [
      '# README',
      'jobs:',
      '  check: {}',
    ].join('\n'))
  })

  it('unwrap は印の行だけを消す', () => {
    assert.equal(stripMarkedBlocks(text, 'infra', 'unwrap'), [
      '# README',
      '配備の説明',
      'jobs:',
      '  cdk-diff: {}',
      '  check: {}',
    ].join('\n'))
  })

  it('別の印には触れない', () => {
    assert.equal(stripMarkedBlocks(text, 'template', 'remove'), text)
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
    assert.equal(removeLockfileImporter(lockfile, 'apps/infra'), [
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
    assert.equal(removeLockfileImporter(lockfile, 'packages/contracts'), [
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
    assert.equal(
      removeLockfileImporter('importers:\n\n  apps/infra:\n    dependencies: {}\n', 'apps/infra'),
      'importers:\n',
    )
  })

  it('該当する importer がなければそのまま返す', () => {
    assert.equal(removeLockfileImporter(lockfile, 'apps/unknown'), lockfile)
  })
})
