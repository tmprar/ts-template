import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatAnnotations, formatRanges, formatSummary, insertSection, lineCoverage, meetsThreshold, parseCoverageSummary, parseDiff, summarize } from './format.mjs'

describe('parseDiff', () => {
  it('ファイルごとに、追加・変更した行の番号を返し、削除だけの変更と消したファイルは含めない', () => {
    const diff = [
      'diff --git a/apps/api/src/a.ts b/apps/api/src/a.ts',
      '--- a/apps/api/src/a.ts',
      '+++ b/apps/api/src/a.ts',
      '@@ -3 +3,2 @@',
      '@@ -10,2 +11,0 @@',
      '@@ -20 +20 @@',
      'diff --git a/apps/api/src/b.ts b/apps/api/src/b.ts',
      '--- a/apps/api/src/b.ts',
      '+++ /dev/null',
      '@@ -1,3 +0,0 @@',
    ].join('\n')

    assert.deepEqual(parseDiff(diff), new Map([['apps/api/src/a.ts', new Set([3, 4, 20])]]))
  })
})

describe('lineCoverage', () => {
  it('文が始まる行を実行できる行とし、その行の文のどれかが実行されていれば通ったとする', () => {
    const fileCoverage = {
      s: { 0: 0, 1: 2, 2: 0 },
      statementMap: {
        0: { start: { line: 1 } },
        1: { start: { line: 1 } },
        2: { start: { line: 5 } },
      },
    }

    assert.deepEqual(lineCoverage(fileCoverage), new Map([[1, true], [5, false]]))
  })
})

describe('summarize', () => {
  it('計測の対象のファイルの、実行できる変更した行だけを数え、実行できる変更した行のあるファイルごとに数と通っていない行を返す', () => {
    const changed = new Map([
      ['apps/api/src/a.ts', new Set([1, 2, 5, 6])],
      ['apps/api/src/b.ts', new Set([3])],
      ['apps/api/src/c.ts', new Set([9])],
      ['apps/api/test/a.spec.ts', new Set([1])],
    ])
    const coverage = {
      '/repo/apps/api/src/a.ts': {
        s: { 0: 1, 1: 0, 2: 0 },
        statementMap: {
          0: { start: { line: 1 } },
          1: { start: { line: 5 } },
          2: { start: { line: 6 } },
        },
      },
      '/repo/apps/api/src/b.ts': { s: { 0: 1 }, statementMap: { 0: { start: { line: 3 } } } },
      '/repo/apps/api/src/c.ts': { s: { 0: 1 }, statementMap: { 0: { start: { line: 1 } } } },
    }

    assert.deepEqual(summarize(changed, coverage, '/repo'), {
      covered: 2,
      executable: 4,
      files: [
        { covered: 1, executable: 3, file: 'apps/api/src/a.ts', uncovered: [5, 6] },
        { covered: 1, executable: 1, file: 'apps/api/src/b.ts', uncovered: [] },
      ],
    })
  })
})

describe('parseCoverageSummary', () => {
  it('全体と、パッケージのディレクトリ以降のパスのファイルごとに、行の数を返す', () => {
    const lines = (covered, total) => ({ lines: { covered, pct: 0, skipped: 0, total } })
    const coverageSummary = {
      '/home/runner/work/r/r/apps/api/src/a.ts': lines(3, 4),
      'total': lines(3, 4),
    }

    assert.deepEqual(parseCoverageSummary(coverageSummary, 'apps/api'), {
      files: new Map([['apps/api/src/a.ts', { covered: 3, total: 4 }]]),
      total: { covered: 3, total: 4 },
    })
  })
})

describe('formatRanges', () => {
  it('連続した行番号を範囲にまとめる', () => {
    assert.equal(formatRanges([1, 2, 3, 7, 9, 10]), '1-3, 7, 9-10')
  })
})

describe('formatAnnotations', () => {
  it('通っていない行の範囲ごとに、ファイルと行を指定した注記を作り、通っていない行の無いファイルには作らない', () => {
    const commands = formatAnnotations({
      covered: 1,
      executable: 4,
      files: [
        { covered: 0, executable: 3, file: 'apps/api/src/a.ts', uncovered: [5, 6, 9] },
        { covered: 1, executable: 1, file: 'apps/api/src/b.ts', uncovered: [] },
      ],
    })

    assert.equal(commands, [
      '::warning file=apps/api/src/a.ts,line=5,endLine=6,title=差分のカバレッジ::テストが通っていない行',
      '::warning file=apps/api/src/a.ts,line=9,endLine=9,title=差分のカバレッジ::テストが通っていない行',
      '',
    ].join('\n'))
  })
})

describe('formatSummary', () => {
  const head = {
    files: new Map([
      ['apps/api/src/a.ts', { covered: 8, total: 10 }],
      ['apps/api/src/b.ts', { covered: 3, total: 4 }],
      ['apps/api/src/c.ts', { covered: 5, total: 5 }],
      ['apps/api/src/d.ts', { covered: 2, total: 2 }],
    ]),
    total: { covered: 18, total: 21 },
  }

  it('比較の基準のカバレッジがあれば、変更した行のカバレッジ、全体の増減、影響のあったファイルの増減を並べる', () => {
    const base = {
      files: new Map([
        ['apps/api/src/a.ts', { covered: 9, total: 10 }],
        ['apps/api/src/b.ts', { covered: 2, total: 4 }],
        ['apps/api/src/d.ts', { covered: 2, total: 2 }],
      ]),
      total: { covered: 13, total: 16 },
    }
    const summary = {
      covered: 2,
      executable: 4,
      files: [
        { covered: 1, executable: 3, file: 'apps/api/src/a.ts', uncovered: [5, 6] },
        { covered: 1, executable: 1, file: 'apps/api/src/c.ts', uncovered: [] },
      ],
    }

    const markdown = formatSummary({ base, baseLabel: 'main', blobUrl: 'https://g/blob/sha', head, headLabel: '#7', summary })

    assert.equal(markdown, [
      '### 差分のカバレッジ',
      '',
      '⚠️ 変更した行のカバレッジは 50.00% で、2 行はテストが通っていない。',
      '',
      '| ファイル | 変更した行のカバレッジ | テストが通っていない行 |',
      '| --- | ---: | --- |',
      '| [apps/api/src/a.ts](https://g/blob/sha/apps/api/src/a.ts#L5) | 33.33% | 5-6 |',
      '',
      '#### Coverage Diff',
      '',
      '```diff',
      '@@          Coverage Diff           @@',
      '##            main      #7     +/-  ##',
      '======================================',
      '+ Coverage  81.25%  85.71%  +4.46%',
      '======================================',
      '  Lines         16      21      +5',
      '======================================',
      '+ Hits          13      18      +5',
      '  Misses         3       3',
      '```',
      '',
      '#### Impacted Files',
      '',
      '| ファイル | カバレッジ Δ | |',
      '| --- | --- | --- |',
      '| [apps/api/src/a.ts](https://g/blob/sha/apps/api/src/a.ts) | `80.00% <33.33%> (-10.00%)` | ⬇️ |',
      '| [apps/api/src/b.ts](https://g/blob/sha/apps/api/src/b.ts) | `75.00% (+25.00%)` | ⬆️ |',
      '| [apps/api/src/c.ts](https://g/blob/sha/apps/api/src/c.ts) | `100.00% <100.00%> (ø)` |  |',
      '',
    ].join('\n'))
  })

  it('比較の基準のカバレッジが無ければ、増減を書かずに現在の値だけを書く', () => {
    const summary = { covered: 1, executable: 1, files: [{ covered: 1, executable: 1, file: 'apps/api/src/c.ts', uncovered: [] }] }

    const markdown = formatSummary({ base: undefined, baseLabel: 'main', blobUrl: 'https://g/blob/sha', head, headLabel: '#7', summary })

    assert.equal(markdown, [
      '### 差分のカバレッジ',
      '',
      '✅ 変更した行のうち、カバレッジの計測の対象の行は、すべてテストが通っている。',
      '',
      '#### Coverage',
      '',
      'main のカバレッジが無いので、増減は書かない。',
      '',
      '```diff',
      '@@     Coverage     @@',
      '##              #7  ##',
      '======================',
      '  Coverage  85.71%',
      '======================',
      '  Lines         21',
      '======================',
      '  Hits          18',
      '  Misses         3',
      '```',
      '',
      '#### Impacted Files',
      '',
      '| ファイル | カバレッジ Δ | |',
      '| --- | --- | --- |',
      '| [apps/api/src/c.ts](https://g/blob/sha/apps/api/src/c.ts) | `100.00% <100.00%>` |  |',
      '',
    ].join('\n'))
  })
})

describe('formatSummary の計測の対象の行が無いとき', () => {
  it('変更した行に計測の対象の行が無いことを書き、全体のカバレッジは 0 行を 100% とする', () => {
    const head = { files: new Map(), total: { covered: 0, total: 0 } }

    const markdown = formatSummary({ base: undefined, baseLabel: 'main', blobUrl: '', head, headLabel: '#7', summary: { covered: 0, executable: 0, files: [] } })

    assert.equal(markdown, [
      '### 差分のカバレッジ',
      '',
      '変更した行に、カバレッジの計測の対象の行は無い。',
      '',
      '#### Coverage',
      '',
      'main のカバレッジが無いので、増減は書かない。',
      '',
      '```diff',
      '@@     Coverage      @@',
      '##               #7  ##',
      '=======================',
      '  Coverage  100.00%',
      '=======================',
      '  Lines           0',
      '=======================',
      '  Hits            0',
      '  Misses          0',
      '```',
      '',
      '#### Impacted Files',
      '',
      '影響のあったファイルは無い。',
      '',
    ].join('\n'))
  })
})

describe('insertSection', () => {
  const marker = '<!-- vitest-coverage-report-marker-api -->'

  it('marker の直前に節を入れる', () => {
    assert.equal(
      insertSection(`## Coverage Report\n\n${marker}`, '### 差分\n', marker),
      `## Coverage Report\n\n<!-- diff-coverage-start -->\n### 差分\n<!-- diff-coverage-end -->\n\n${marker}`,
    )
  })

  it('前に入れた節があれば置き換える', () => {
    const body = `## Coverage Report\n\n<!-- diff-coverage-start -->\n### 古い\n<!-- diff-coverage-end -->\n\n${marker}`

    assert.equal(
      insertSection(body, '### 新しい\n', marker),
      `## Coverage Report\n\n<!-- diff-coverage-start -->\n### 新しい\n<!-- diff-coverage-end -->\n\n${marker}`,
    )
  })

  it('marker が無ければ undefined を返す', () => {
    assert.equal(insertSection('## Coverage Report', '### 差分\n', marker), undefined)
  })
})

describe('meetsThreshold', () => {
  it('割合が基準以上か、計測の対象の行が無ければ true を返す', () => {
    assert.deepEqual([
      meetsThreshold({ covered: 4, executable: 5 }, 80),
      meetsThreshold({ covered: 3, executable: 5 }, 80),
      meetsThreshold({ covered: 0, executable: 0 }, 80),
    ], [true, false, true])
  })
})
