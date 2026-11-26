/*
  使い方: node index.mjs <カバレッジのディレクトリ> <比較の基準の ref> <パッケージのディレクトリ> <基準の %>
  カバレッジのディレクトリには、vitest が出力した coverage-final.json と coverage-summary.json を置く。
  環境変数 DIFF_COVERAGE_BLOB_URL に、ファイルパスの基点になる GitHub の URL を、DIFF_COVERAGE_BASELINE に、比較の基準のブランチで計測した
  coverage-summary.json のパスを渡す。比較の基準のカバレッジが無ければ、増減を書かずに現在の値だけを書く。
  Markdown を環境変数 GITHUB_STEP_SUMMARY のファイル(無ければ標準エラー出力)と、環境変数 DIFF_COVERAGE_OUTPUT のファイル(あれば)に、
  テストが通っていない行の注記を標準出力に書き、変更した行のカバレッジが基準を下回ると終了コードを 1 にする
*/
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

import { formatAnnotations, formatSummary, meetsThreshold, parseCoverageSummary, parseDiff, summarize } from './format.mjs'

const [coverageDir, baseRef, packageDir, thresholdText] = process.argv.slice(2)
if (thresholdText === undefined) {
  console.error('使い方: node index.mjs <カバレッジのディレクトリ> <比較の基準の ref> <パッケージのディレクトリ> <基準の %>')
  process.exit(2)
}
const threshold = Number(thresholdText)
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const diff = execFileSync('git', ['diff', '--unified=0', `${baseRef}...HEAD`, '--', packageDir], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const coverage = JSON.parse(readFileSync(`${coverageDir}/coverage-final.json`, 'utf8'))
const summary = summarize(parseDiff(diff), coverage, repoRoot)
const head = parseCoverageSummary(JSON.parse(readFileSync(`${coverageDir}/coverage-summary.json`, 'utf8')), packageDir)
const baselinePath = process.env.DIFF_COVERAGE_BASELINE
const base = baselinePath && existsSync(baselinePath)
  ? parseCoverageSummary(JSON.parse(readFileSync(baselinePath, 'utf8')), packageDir)
  : undefined

const markdown = formatSummary({
  base,
  baseLabel: baseRef.replace(/^origin\//, ''),
  blobUrl: process.env.DIFF_COVERAGE_BLOB_URL ?? '',
  head,
  headLabel: process.env.PR_NUMBER ? `#${process.env.PR_NUMBER}` : 'HEAD',
  summary,
})
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
else process.stderr.write(markdown)
if (process.env.DIFF_COVERAGE_OUTPUT) writeFileSync(process.env.DIFF_COVERAGE_OUTPUT, markdown)
process.stdout.write(formatAnnotations(summary))
process.exitCode = meetsThreshold(summary, threshold) ? 0 : 1
