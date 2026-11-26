/**
 * `git diff --unified=0` の出力から、ファイルごとに追加・変更した行の番号を読み取る。削除だけの変更は行を持たないので含めない
 */
export function parseDiff(diffText) {
  const changed = new Map()
  let file = null
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line === '+++ /dev/null' ? null : line.slice('+++ b/'.length)
      continue
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (hunk === null || file === null) continue
    const start = Number(hunk[1])
    const count = hunk[2] === undefined ? 1 : Number(hunk[2])
    if (count === 0) continue
    const lines = changed.get(file) ?? new Set()
    for (let offset = 0; offset < count; offset++) lines.add(start + offset)
    changed.set(file, lines)
  }

  return changed
}

/**
 * istanbul の形式の 1 ファイルぶんのカバレッジから、実行できる行ごとに、テストが通ったかを返す。
 * 行は、その行から始まる文があるときに実行できるとみなし、その文のどれかが 1 回でも実行されていれば通ったとする
 */
export function lineCoverage(fileCoverage) {
  const lines = new Map()
  for (const [id, location] of Object.entries(fileCoverage.statementMap)) {
    const line = location.start.line
    lines.set(line, (lines.get(line) ?? false) || fileCoverage.s[id] > 0)
  }

  return lines
}

/**
 * 変更した行のうち実行できる行を数え、実行できる変更した行のあるファイルごとに、その数とテストが通っていない行を返す。
 * カバレッジの計測の対象でないファイル(テスト、設定、生成物)の行は数えない。
 * coverage のキーは絶対パスで、changed のキーはリポジトリのルートからの相対パスなので、ルートを付けて突き合わせる
 */
export function summarize(changed, coverage, repoRoot) {
  const files = []
  let executable = 0
  let covered = 0
  for (const [file, lines] of changed) {
    const fileCoverage = coverage[`${repoRoot}/${file}`]
    if (fileCoverage === undefined) continue
    const byLine = lineCoverage(fileCoverage)
    const uncovered = []
    let fileExecutable = 0
    for (const line of [...lines].toSorted((a, b) => a - b)) {
      if (!byLine.has(line)) continue
      fileExecutable++
      if (!byLine.get(line)) uncovered.push(line)
    }
    executable += fileExecutable
    covered += fileExecutable - uncovered.length
    if (fileExecutable > 0) files.push({ covered: fileExecutable - uncovered.length, executable: fileExecutable, file, uncovered })
  }

  return { covered, executable, files }
}

/**
 * 連続した行番号を `10-12` の範囲にまとめた文字列にする
 */
export function formatRanges(lines) {
  const ranges = []
  for (const line of lines) {
    const last = ranges.at(-1)
    if (last !== undefined && last[1] === line - 1) last[1] = line
    else ranges.push([line, line])
  }

  return ranges.map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`)).join(', ')
}

/**
 * テストが通っていない行の範囲ごとに、GitHub Actions の注記のコマンドを作る。注記は PR の Files changed の該当する行に表示される
 */
export function formatAnnotations(summary) {
  const commands = []
  for (const { file, uncovered } of summary.files.filter(({ uncovered }) => uncovered.length > 0)) {
    for (const range of formatRanges(uncovered).split(', ')) {
      const [start, end = start] = range.split('-')
      commands.push(`::warning file=${file},line=${start},endLine=${end},title=差分のカバレッジ::テストが通っていない行`)
    }
  }

  return commands.map((command) => `${command}\n`).join('')
}

/**
 * istanbul の json-summary の形式のカバレッジから、全体と、packageDir からのパスのファイルごとの行の数を返す。
 * キーの絶対パスは計測した環境ごとに異なるので、パッケージのディレクトリ以降の、リポジトリのルートからの相対パスにそろえる
 */
export function parseCoverageSummary(coverageSummary, packageDir) {
  const files = new Map()
  for (const [path, { lines }] of Object.entries(coverageSummary)) {
    const index = path.indexOf(`/${packageDir}/`)
    if (path === 'total' || index === -1) continue
    files.set(path.slice(index + 1), { covered: lines.covered, total: lines.total })
  }
  const { lines } = coverageSummary.total

  return { files, total: { covered: lines.covered, total: lines.total } }
}

/**
 * 差分のカバレッジの節の Markdown を作る。ジョブの Summary と PR のコメントに載せる。
 * 変更した行のカバレッジ、全体のカバレッジ(Coverage Diff)、影響のあったファイル(Impacted Files)を、Codecov の PR のコメントの形式で並べる。
 * base(比較の基準のカバレッジ)が無ければ、増減を書かずに現在の値だけを書く。
 * 基準を満たすかどうかは書かない。基準を下回れば CI のチェックが失敗するので、PR の画面から分かる
 */
export function formatSummary({ base, baseLabel, blobUrl, head, headLabel, summary }) {
  return [
    '### 差分のカバレッジ',
    '',
    ...formatPatch({ blobUrl, summary }),
    '',
    base === undefined ? '#### Coverage' : '#### Coverage Diff',
    '',
    ...(base === undefined ? [`${baseLabel} のカバレッジが無いので、増減は書かない。`, ''] : []),
    ...formatCoverageDiff({ base: base?.total, baseLabel, head: head.total, headLabel }),
    '',
    '#### Impacted Files',
    '',
    ...formatImpactedFiles({ base, blobUrl, head, summary }),
    '',
  ].join('\n')
}

/**
 * 変更した行のカバレッジを書いた行を返す。テストが通っていない行があれば、その行のあるファイルの表を付ける
 */
function formatPatch({ blobUrl, summary }) {
  if (summary.executable === 0) return ['変更した行に、カバレッジの計測の対象の行は無い。']
  const missingFiles = summary.files.filter(({ uncovered }) => uncovered.length > 0)
  if (missingFiles.length === 0) {
    return ['✅ 変更した行のうち、カバレッジの計測の対象の行は、すべてテストが通っている。']
  }

  return [
    `⚠️ 変更した行のカバレッジは ${formatPercent(summary.covered, summary.executable)} で、${summary.executable - summary.covered} 行はテストが通っていない。`,
    '',
    '| ファイル | 変更した行のカバレッジ | テストが通っていない行 |',
    '| --- | ---: | --- |',
    ...missingFiles.map(file => `| [${file.file}](${blobUrl}/${file.file}#L${file.uncovered[0]}) | ${formatPercent(file.covered, file.executable)} | ${formatRanges(file.uncovered)} |`),
  ]
}

/**
 * 全体のカバレッジを、Codecov の Coverage Diff の形式(diff のコードブロック)の行で返す。
 * 行頭の `+` と `-` は、カバレッジが上がった・下がった方向を表す。増減が 0 の欄は空ける。base が無ければ head の列だけにする
 */
function formatCoverageDiff({ base, baseLabel, head, headLabel }) {
  const rows = [
    { better: 'up', label: 'Coverage', value: rate },
    { label: 'Lines', value: total => total.total },
    { better: 'up', label: 'Hits', value: total => total.covered },
    { better: 'down', label: 'Misses', value: total => total.total - total.covered },
  ]
  const format = (row, value) => (row.label === 'Coverage' ? `${value.toFixed(2)}%` : `${value}`)
  const columns = base === undefined ? [headLabel] : [baseLabel, headLabel, '+/-']
  const cells = rows.map((row) => {
    const headValue = row.value(head)
    if (base === undefined) return { prefix: ' ', values: [format(row, headValue)] }
    const delta = headValue - row.value(base)
    const sign = delta > 0 ? '+' : ''
    const deltaText = delta === 0 ? '' : row.label === 'Coverage' ? `${sign}${delta.toFixed(2)}%` : `${sign}${delta}`
    const improved = row.better === 'up' ? delta > 0 : delta < 0
    const worsened = row.better === 'up' ? delta < 0 : delta > 0
    const prefix = row.better === undefined || (!improved && !worsened) ? ' ' : improved ? '+' : '-'

    return { prefix, values: [format(row, row.value(base)), format(row, headValue), deltaText] }
  })
  const labelWidth = Math.max(...rows.map(({ label }) => label.length))
  const widths = columns.map((column, index) => Math.max(column.length, ...cells.map(({ values }) => values[index].length)) + 2)
  const line = (prefix, label, values) => `${prefix} ${label.padEnd(labelWidth)}${values.map((value, index) => value.padStart(widths[index])).join('')}`.trimEnd()
  const header = `${line('#', '', columns)}  ##`.replace(/^# /, '##')
  const rule = '='.repeat(header.length)
  const title = base === undefined ? 'Coverage' : 'Coverage Diff'
  const padding = Math.max(0, header.length - title.length - 6)
  const body = cells.map((cell, index) => line(cell.prefix, rows[index].label, cell.values))

  return [
    '```diff',
    `@@${' '.repeat(Math.floor(padding / 2) + 1)}${title}${' '.repeat(Math.ceil(padding / 2) + 1)}@@`,
    header,
    rule,
    body[0],
    rule,
    body[1],
    rule,
    body[2],
    body[3],
    '```',
  ]
}

/**
 * 変更した行のあるファイルと、base と比べて行のカバレッジが変わったファイルを、Codecov の Impacted Files の形式の表の行で返す。
 * カバレッジ Δ の列は「現在のカバレッジ <変更した行のカバレッジ> (base からの増減)」で、増減が無いファイルと base に無いファイルの増減は ø にする
 */
function formatImpactedFiles({ base, blobUrl, head, summary }) {
  const patches = new Map(summary.files.map(file => [file.file, file]))
  const impacted = [...head.files.keys()].filter((file) => {
    if (patches.has(file)) return true
    const before = base?.files.get(file)

    return before !== undefined && rate(before) !== rate(head.files.get(file))
  }).toSorted()
  if (impacted.length === 0) return ['影響のあったファイルは無い。']

  const rows = impacted.map((file) => {
    const current = head.files.get(file)
    const patch = patches.get(file)
    const parts = [formatPercent(current.covered, current.total)]
    if (patch !== undefined) parts.push(`<${formatPercent(patch.covered, patch.executable)}>`)
    let arrow = ''
    if (base !== undefined) {
      const before = base.files.get(file)
      if (before === undefined) {
        parts.push('(ø)')
      }
      else {
        const delta = rate(current) - rate(before)
        parts.push(delta === 0 ? '(ø)' : `(${delta > 0 ? '+' : ''}${delta.toFixed(2)}%)`)
        arrow = delta > 0 ? '⬆️' : delta < 0 ? '⬇️' : ''
      }
    }

    return `| [${file}](${blobUrl}/${file}) | \`${parts.join(' ')}\` | ${arrow} |`
  })

  return ['| ファイル | カバレッジ Δ | |', '| --- | --- | --- |', ...rows]
}

/**
 * 行の数から、テストが通った行の割合を百分率の数値で返す。実行できる行が無ければ 100 とする
 */
function rate({ covered, total }) {
  return total === 0 ? 100 : covered / total * 100
}

/**
 * テストが通った行の割合を、小数点以下 2 桁の百分率の文字列にする
 */
function formatPercent(covered, total) {
  return `${rate({ covered, total }).toFixed(2)}%`
}

const SECTION_START = '<!-- diff-coverage-start -->'
const SECTION_END = '<!-- diff-coverage-end -->'

/**
 * コメントの本文の marker の直前に、差分のカバレッジの節を入れた本文を返す。前に入れた節があれば置き換える。
 * marker が無ければ undefined を返す
 */
export function insertSection(body, section, marker) {
  const start = body.indexOf(SECTION_START)
  const end = body.indexOf(SECTION_END)
  const base = start !== -1 && end > start
    ? `${body.slice(0, start).trimEnd()}\n\n${body.slice(end + SECTION_END.length).trimStart()}`
    : body
  const markerIndex = base.indexOf(marker)
  if (markerIndex === -1) return undefined

  return `${base.slice(0, markerIndex).trimEnd()}\n\n${SECTION_START}\n${section.trimEnd()}\n${SECTION_END}\n\n${base.slice(markerIndex)}`
}

/**
 * 変更した行のカバレッジが基準を満たすときに true を返す。計測の対象の行が無いときは満たすとする
 */
export function meetsThreshold(summary, threshold) {
  return summary.executable === 0 || (summary.covered / summary.executable) * 100 >= threshold
}
