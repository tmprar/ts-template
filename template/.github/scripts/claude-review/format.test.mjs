import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatInlineComment, formatResolvedReply, formatSummary, parseThread } from './format.mjs'

/**
 * 指定した項目だけを変えた指摘を作る
 */
function finding(overrides) {
  return { basis: 'CLAUDE.md「テスト」', detail: '内容', kind: 'must', line: 3, path: 'a.ts', suggestion: null, title: '要約', ...overrides }
}

describe('formatInlineComment', () => {
  it('修正案が無ければ、種類と要約、根拠、内容の順に並べる', () => {
    assert.equal(formatInlineComment(finding({})), '**[修正が必要]** 要約\n\n根拠: CLAUDE.md「テスト」\n\n内容')
  })

  it('修正案があれば、最後に suggestion ブロックを置く', () => {
    assert.equal(
      formatInlineComment(finding({ kind: 'suggest', suggestion: 'const a = 1' })),
      '**[提案]** 要約\n\n根拠: CLAUDE.md「テスト」\n\n内容\n\n```suggestion\nconst a = 1\n```',
    )
  })
})

describe('formatResolvedReply', () => {
  it('返信の本文の後に、対象のコミットを書く', () => {
    assert.equal(
      formatResolvedReply({ headSha: 'abc', reply: '`a.ts:3` で null を検査している' }),
      '`a.ts:3` で null を検査している\n\n直ったと判断したため解決済みにする(対象のコミット: abc)',
    )
  })
})

describe('parseThread', () => {
  it('1 行目の種類と要約を取り出す', () => {
    const thread = { body: '**[修正が必要]** 要約\n\n根拠: x', line: 3, path: 'a.ts', url: 'https://example.com/1' }

    assert.deepEqual(parseThread(thread), { kind: 'must', line: 3, path: 'a.ts', title: '要約', url: 'https://example.com/1' })
  })

  it('1 行目が書式に合わなければ、提案として 1 行目全体を要約にする', () => {
    const thread = { body: '書式に合わない指摘\n\n本文', line: null, path: 'a.ts', url: 'https://example.com/2' }

    assert.deepEqual(parseThread(thread), { kind: 'suggest', line: null, path: 'a.ts', title: '書式に合わない指摘', url: 'https://example.com/2' })
  })
})

describe('formatSummary', () => {
  it('指摘が無ければ、結論と変更の要約だけを書く', () => {
    assert.equal(
      formatSummary({ changeSummary: '変更', headSha: 'abc', items: [] }),
      '<!-- Sticky Pull Request Commentclaude-review -->\n\n## 結論\n\n修正が必要な指摘はない\n\n## 変更の要約\n\n変更\n\nレビューの対象のコミット: abc',
    )
  })

  it('指摘を種類ごとに分け、インラインコメントにできなかった指摘には内容を添える', () => {
    const items = [
      { ...finding({}), url: 'https://example.com/1' },
      { ...finding({ detail: '1 行目\n2 行目', line: null, path: null, title: '全体' }), url: undefined },
      { kind: 'suggest', line: 5, path: 'b.ts', title: '残る指摘', url: 'https://example.com/2' },
    ]

    assert.equal(
      formatSummary({ changeSummary: '変更', headSha: 'abc', items }),
      [
        '<!-- Sticky Pull Request Commentclaude-review -->',
        '## 結論',
        '修正が必要な指摘が 2 件ある',
        '## 変更の要約',
        '変更',
        '## 指摘',
        '### 修正が必要',
        '- `a.ts:3` [要約](https://example.com/1)(CLAUDE.md「テスト」)\n- 全体(CLAUDE.md「テスト」)\n  1 行目\n  2 行目',
        '### 提案',
        '- `b.ts:5` [残る指摘](https://example.com/2)',
        'レビューの対象のコミット: abc',
      ].join('\n\n'),
    )
  })
})
