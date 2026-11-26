/**
 * 要約のコメントを見分ける印。marocchino/sticky-pull-request-comment が header: claude-review で付ける印と同じにし、
 * 以前の実行がその action で投稿した要約を、上書きの対象にする
 */
export const SUMMARY_MARKER = '<!-- Sticky Pull Request Commentclaude-review -->'

const KIND_LABELS = { must: '修正が必要', suggest: '提案' }

/**
 * 指摘から、インラインコメントの本文を作る。1 行目に指摘の種類と要約を置き、根拠、内容、修正案の順に続ける
 */
export function formatInlineComment(finding) {
  const parts = [
    `**[${KIND_LABELS[finding.kind]}]** ${finding.title}`,
    `根拠: ${finding.basis}`,
    finding.detail,
  ]
  if (finding.suggestion !== null) {
    parts.push(`\`\`\`suggestion\n${finding.suggestion}\n\`\`\``)
  }

  return parts.join('\n\n')
}

/**
 * 直ったと判断したスレッドへの返信の本文を作る。どのコミットで判断したかを読み取れるよう、末尾に対象のコミットを書く
 */
export function formatResolvedReply({ headSha, reply }) {
  return `${reply}\n\n直ったと判断したため解決済みにする(対象のコミット: ${headSha})`
}

/**
 * 未解決のスレッドの最初のコメントから、要約に載せる指摘を作る。1 行目が formatInlineComment の書式に合わなければ、提案として扱う
 */
export function parseThread(thread) {
  const firstLine = thread.body.split('\n')[0]
  const match = /^\*\*\[(.+?)\]\*\*\s*(.*)$/.exec(firstLine)
  const kind = match?.[1] === KIND_LABELS.must ? 'must' : 'suggest'

  return { kind, line: thread.line, path: thread.path, title: match?.[2] ?? firstLine, url: thread.url }
}

/**
 * 要約の指摘の一覧の 1 行を作る。指摘に url があれば、そのコメントへのリンクにする
 */
function formatSummaryItem(item) {
  const location = item.path === null ? '' : `\`${item.path}${item.line === null ? '' : `:${item.line}`}\` `
  const title = item.url === undefined ? item.title : `[${item.title}](${item.url})`
  const basis = item.basis === undefined ? '' : `(${item.basis})`
  // インラインコメントにできなかった指摘は、内容を読める場所がほかに無いため、要約に内容も載せる
  const detail = item.url === undefined && item.detail !== undefined ? `\n  ${item.detail.replaceAll('\n', '\n  ')}` : ''

  return `- ${location}${title}${basis}${detail}`
}

/**
 * 結論、変更の要約、指摘の一覧の順に並べた要約を作る。指摘が無い種類の節は書かない
 */
export function formatSummary({ changeSummary, headSha, items }) {
  const mustCount = items.filter(item => item.kind === 'must').length
  const sections = [
    SUMMARY_MARKER,
    '## 結論',
    mustCount === 0 ? '修正が必要な指摘はない' : `修正が必要な指摘が ${mustCount} 件ある`,
    '## 変更の要約',
    changeSummary,
  ]
  const groups = Object.entries(KIND_LABELS)
    .map(([kind, label]) => ({ items: items.filter(item => item.kind === kind), label }))
    .filter(group => group.items.length > 0)
  if (groups.length > 0) {
    sections.push('## 指摘')
    for (const group of groups) {
      sections.push(`### ${group.label}`, group.items.map(formatSummaryItem).join('\n'))
    }
  }
  sections.push(`レビューの対象のコミット: ${headSha}`)

  return sections.join('\n\n')
}
